import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import ConfirmationModal from "./ConfirmationModal";
import AddRecordDrawer from "../components/AddRecordDrawer";
import CollectionTable from "../components/CollectionTable";
import DatabaseSidebar from "../components/DatabaseSidebar";
import RowDetailDrawer from "../components/RowDetailDrawer";
import RecordList from "../components/RecordList";
import {
  Database as DbIcon,
  Plus,
  RefreshCw,
  Code,
  Shield,
  Table as TableIcon,
  List as ListIcon,
  Menu,
  FileText,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X
} from "lucide-react";

import { API_URL } from "../config";

// FUNCTION - DATABASE COMPONENT
export default function Database() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [data, setData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null); // For detail drawer
  const [editingRecord, setEditingRecord] = useState(null);

  const [queryParams, setQueryParams] = useState({
      page: 1,
      limit: 50,
      sort: '-createdAt',
      filters: [] // Format: { field: '', operator: '', value: '' }
  });
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [rlsEnabled, setRlsEnabled] = useState(false);
  const [rlsMode, setRlsMode] = useState("public-read");
  const [rlsOwnerField, setRlsOwnerField] = useState("userId");
  const [isSavingRls, setIsSavingRls] = useState(false);
  const [isRlsDialogOpen, setIsRlsDialogOpen] = useState(false);

  const fetchShowModal = (id) => {
    setShowModal(true);
    setSelectedId(id);
  };

// DELETE REQ FOR COLLECTION
  const handleDeleteCollection = async (collectionName) => {
    try {
      await api.delete(
        `/api/projects/${projectId}/collections/${collectionName}`
      );

      const updatedCollections = collections.filter(c => c.name !== collectionName);
      setCollections(updatedCollections);

      if (activeCollection?.name === collectionName) {
        setActiveCollection(updatedCollections.length > 0 ? updatedCollections[0] : null);
        if (updatedCollections.length === 0) {
          setSearchParams({});
        }
      }
      toast.success("Collection deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete collection");
    }
  };
// FUNCTION - FETCH PROJECT & COLLECTIONS
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await api.get(`/api/projects/${projectId}`);
        const withRlsDefaults = (res.data.collections || []).map(c => {
          const schemaKeys = (c.model || []).map(f => f?.key).filter(Boolean);
          // Derive a schema-valid ownerField: prefer userId, then ownerId, then the
          // first schema key as a prompt for the user to review before saving.
          let derivedOwnerField;
          if (c.name === 'users') {
            derivedOwnerField = '_id';
          } else if (schemaKeys.includes('userId')) {
            derivedOwnerField = 'userId';
          } else if (schemaKeys.includes('ownerId')) {
            derivedOwnerField = 'ownerId';
          } else {
            derivedOwnerField = schemaKeys[0] || '';
          }
          const resolvedMode = c.rls?.mode === 'owner-write-only' ? 'public-read' : (c.rls?.mode || 'public-read');
          return {
            ...c,
            rls: {
              enabled: typeof c.rls?.enabled === 'boolean' ? c.rls.enabled : false,
              mode: resolvedMode,
              ownerField: c.rls?.ownerField || derivedOwnerField,
              requireAuthForWrite: typeof c.rls?.requireAuthForWrite === 'boolean' ? c.rls.requireAuthForWrite : true
            }
          };
        });

        setProject(res.data);
        setCollections(withRlsDefaults);

        const queryCollection = searchParams.get("collection");
        if (queryCollection) {
          const found = withRlsDefaults.find(
            (c) => c.name === queryCollection
          );
          if (found) setActiveCollection(found);
        } else {
          const filtered = withRlsDefaults.filter(c => c.name !== 'users');
          if (filtered.length > 0) {
            setActiveCollection(filtered[0]);
          } else if (withRlsDefaults.length > 0) {
            setActiveCollection(withRlsDefaults[0]);
          }
        }
      } catch {
        toast.error("Failed to load project");
      }
    };
    fetchProject();
  }, [projectId, user, searchParams]);

// FUNCTION - FETCH DATA (PAGINATED/FILTERED)
  const fetchData = useCallback(async () => {
    if (!activeCollection) return;
    setLoadingData(true);
    try {
      let queryStr = `?page=${queryParams.page}&limit=${queryParams.limit}`;
      if (queryParams.sort) {
        queryStr += `&sort=${queryParams.sort}`;
      }
      
      queryParams.filters.forEach(filter => {
         if (filter.field && filter.operator && filter.value !== '') {
            if (filter.operator === '=') {
              queryStr += `&${filter.field}=${encodeURIComponent(filter.value)}`;
            } else {
              queryStr += `&${filter.field}${filter.operator}=${encodeURIComponent(filter.value)}`;
            }
         }
      });

      const res = await api.get(
        `/api/projects/${projectId}/collections/${activeCollection.name}/data${queryStr}`
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoadingData(false);
    }
  }, [activeCollection, projectId, queryParams]);

  // Fetch Data on Collection Change
  useEffect(() => {
    if (!activeCollection) return;
    setSearchParams({ collection: activeCollection.name });
    setSelectedRecord(null); // Close any open record detail drawer
    fetchData();
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  }, [activeCollection, fetchData, setSearchParams]);

  useEffect(() => {
    if (!activeCollection) return;
    const modelKeys = (activeCollection.model || []).map(f => f.key);
    const fallbackOwner = activeCollection.name === 'users'
      ? '_id'
      : (modelKeys.includes('userId') ? 'userId' : (modelKeys.includes('ownerId') ? 'ownerId' : 'userId'));
    const resolvedMode = activeCollection?.rls?.mode === 'owner-write-only'
      ? 'public-read'
      : (activeCollection?.rls?.mode || 'public-read');
    setRlsEnabled(!!activeCollection?.rls?.enabled);
    setRlsMode(resolvedMode);
    setRlsOwnerField(activeCollection?.rls?.ownerField || fallbackOwner);
  }, [activeCollection]);

  const handleSaveRls = async () => {
    if (!activeCollection) return false;
    setIsSavingRls(true);
    try {
      const res = await api.patch(
        `/api/projects/${projectId}/collections/${activeCollection.name}/rls`,
        {
          enabled: rlsEnabled,
          mode: rlsMode,
          ownerField: rlsOwnerField,
          requireAuthForWrite: true
        }
      );

      const updatedRls = res.data?.collection?.rls || {
        enabled: rlsEnabled,
        mode: rlsMode,
        ownerField: rlsOwnerField,
        requireAuthForWrite: true
      };

      setCollections(prev => prev.map(c => c.name === activeCollection.name ? { ...c, rls: updatedRls } : c));
      setActiveCollection(prev => prev ? { ...prev, rls: updatedRls } : prev);
      toast.success("RLS settings saved");
      return true;
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to save RLS settings");
      return false;
    } finally {
      setIsSavingRls(false);
    }
  };

  const rlsOwnerFieldOptions = (() => {
    if (!activeCollection) return [];
    const schemaKeys = (activeCollection.model || []).map((f) => f.key).filter(Boolean);
    if (activeCollection.name === 'users') {
      return ['_id', ...schemaKeys.filter(k => k !== '_id')];
    }
    return schemaKeys;
  })();

  const handleDelete = async (id) => {
    // if (!window.confirm("Are you sure you want to delete this document?"))
    //   return;
    try {
      await api.delete(
        `/api/projects/${projectId}/collections/${activeCollection.name}/data/${id}`
      );
      setData((prev) => prev.filter((item) => item._id !== id));
      toast.success("Document deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete document");
    }
  };

  const handleAddDocument = async (submittedData) => {
    setIsSubmitting(true);
    try {
      await api.post(
        `/api/projects/${projectId}/collections/${activeCollection.name}/data`,
        submittedData
      );

      toast.success("Document added successfully");
      setIsAddModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to add data");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleEditRow = (record) => {
    setEditingRecord(record);
    setIsAddModalOpen(true);
  };

  const handleUpdateDocument = async (submittedData) => {
    setIsSubmitting(true);
    try {
      const id = editingRecord._id;
      const res = await api.patch(
        `/api/projects/${projectId}/collections/${activeCollection.name}/data/${id}`,
        submittedData
      );

      toast.success("Document updated successfully");
      setIsAddModalOpen(false);
      setEditingRecord(null);
      // Update local state
      setData((prev) => prev.map((item) => (item._id === id ? res.data.data : item)));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to update data");
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- SUB-COMPONENTS --- //

  const TableView = () => (
    <div className="table-container-wrapper" style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
      <CollectionTable
        data={data}
        activeCollection={activeCollection}
        onDelete={fetchShowModal}
        onView={setSelectedRecord}
        onEdit={handleEditRow}
      />
    </div>
  );

  const JsonView = () => (
    <div
      className="json-container fade-in"
      style={{ height: "100%", overflowY: "auto" }}
    >
      <pre className="json-pre">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );

  const SkeletonLoader = () => (
    <div className="skeleton-container">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton skeleton-text w-full"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="db-layout">
      {/* Mobile Overlay */}
      <div
        className={`sidebar-backdrop ${isSidebarOpen ? "active" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <DatabaseSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        collections={collections}
        activeCollection={activeCollection}
        setActiveCollection={setActiveCollection}
        project={project}
        navigate={navigate}
        projectId={projectId}
        showUsers={activeCollection?.name === 'users'}
        onRequestDelete={setCollectionToDelete}
      />

      <RowDetailDrawer
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        fields={activeCollection?.model || []}
        onEdit={handleEditRow}
      />

      {showModal && (
        <ConfirmationModal
          open={showModal}
          title="Delete Record"
          message="Are you sure you want to delete this record? This action cannot be undone."
          onConfirm={() => {
            handleDelete(selectedId);
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
        />
      )}

      {collectionToDelete && (
        <ConfirmationModal
          open={!!collectionToDelete}
          title="Delete Collection"
          message={`Are you sure you want to delete collection "${collectionToDelete.name}"? This will delete all associated documents permanently.`}
          onConfirm={() => {
            handleDeleteCollection(collectionToDelete.name);
            setCollectionToDelete(null);
          }}
          onCancel={() => setCollectionToDelete(null)}
        />
      )}

      <main className="db-main">
        {activeCollection ? (
          <>
            <header className="db-header glass-panel">
              <div className="header-left">
                <button
                  className="btn-icon hide-desktop menu-trigger"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <div className="breadcrumbs">
                    <span className="crumb-project">{project?.name}</span>
                    <span className="crumb-sep">/</span>
                    <span className="crumb-col">{activeCollection.name}</span>
                  </div>
                  <h1 className="header-title">{activeCollection.name}</h1>
                </div>
              </div>

              <div className="header-actions">
                <span className="record-count">{data.length} Records</span>

                {(activeCollection?.model?.length > 0 || data?.length > 0) && (
                  <div className="view-toggle">
                    <button
                      className={`toggle-btn ${viewMode === "list" ? "active" : ""
                        }`}
                      onClick={() => setViewMode("list")}
                      title="List View"
                    >
                      <ListIcon size={16} />
                    </button>
                    <button
                      className={`toggle-btn ${viewMode === "table" ? "active" : ""
                        }`}
                      onClick={() => setViewMode("table")}
                      title="Table View (Advanced)"
                    >
                      <TableIcon size={16} />
                    </button>
                    <button
                      className={`toggle-btn ${viewMode === "json" ? "active" : ""
                        }`}
                      onClick={() => setViewMode("json")}
                      title="JSON View"
                    >
                      <Code size={16} />
                    </button>
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <button
                    className={`btn ${showFilterMenu ? 'btn-primary' : 'btn-secondary'} btn-icon-only filter-trigger`}
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    title="Filter & Sort"
                  >
                    <Filter size={18} />
                    {queryParams.filters.length > 0 && (
                      <span className="filter-badge">{queryParams.filters.length}</span>
                    )}
                  </button>
                  
                  {showFilterMenu && (
                    <>
                      <div className="fixed-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowFilterMenu(false)} />
                      <div className="filter-menu glass-panel" style={{ 
                        position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: '300px', 
                        zIndex: 9000000000, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                        background: '#151515', border: '1px solid var(--color-border)', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.7)', borderRadius: '8px'
                      }}>
                        
                        {/* SORTING SECTION */}
                        <div className="filter-section">
                          <div className="section-title mb-2"><ArrowUpDown size={14} /> SORT BY</div>
                          <div className="flex gap-2">
                            <select 
                              className="form-input" 
                              value={queryParams.sort.replace('-', '')}
                              onChange={(e) => {
                                const isDesc = queryParams.sort.startsWith('-');
                                setQueryParams(p => ({ ...p, sort: `${isDesc ? '-' : ''}${e.target.value}` }));
                              }}
                              style={{ flex: 1 }}
                            >
                              <option value="createdAt">Created At</option>
                                {activeCollection?.model?.map(f => (
                                  <option key={f.key} value={f.key}>{f.key}</option>
                                ))}
                            </select>
                            <button 
                              className="btn btn-secondary btn-icon-only"
                              onClick={() => {
                                const isDesc = queryParams.sort.startsWith('-');
                                const field = queryParams.sort.replace('-', '');
                                setQueryParams(p => ({ ...p, sort: isDesc ? field : `-${field}` }));
                              }}
                              title="Toggle direction"
                            >
                              {queryParams.sort.startsWith('-') ? '↓' : '↑'}
                            </button>
                          </div>
                        </div>

                        {/* FILTERING SECTION */}
                        <div className="filter-section">
                          <div className="section-title mb-2"><Filter size={14} /> FILTERS</div>
                          
                          {queryParams.filters.map((filter, idx) => (
                            <div key={idx} className="active-filter-row flex gap-2 items-center mb-2">
                              <select 
                                className="form-input"
                                value={filter.field}
                                onChange={e => {
                                  const newFilters = [...queryParams.filters];
                                  newFilters[idx].field = e.target.value;
                                  setQueryParams(p => ({ ...p, filters: newFilters }));
                                }}
                                style={{ width: '35%', padding: '4px' }}
                              >
                                <option value="" disabled>Field</option>
                                {activeCollection?.model?.map(f => (
                                  <option key={f.key} value={f.key}>{f.key}</option>
                                ))}
                              </select>
                              
                              <select 
                                className="form-input"
                                value={filter.operator}
                                onChange={e => {
                                  const newFilters = [...queryParams.filters];
                                  newFilters[idx].operator = e.target.value;
                                  setQueryParams(p => ({ ...p, filters: newFilters }));
                                }}
                                style={{ width: '30%', padding: '4px' }}
                              >
                                <option value="" disabled>Op</option>
                                <option value="=">=</option>
                                <option value="_gt">&gt;</option>
                                <option value="_gte">&ge;</option>
                                <option value="_lt">&lt;</option>
                                <option value="_lte">&le;</option>
                              </select>
                              
                              <input 
                                type="text"
                                className="form-input"
                                placeholder="Value"
                                value={filter.value}
                                onChange={e => {
                                  const newFilters = [...queryParams.filters];
                                  newFilters[idx].value = e.target.value;
                                  setQueryParams(p => ({ ...p, filters: newFilters }));
                                }}
                                style={{ width: '35%', padding: '4px' }}
                              />
                              
                              <button 
                                className="btn-icon danger-hover shrink-0"
                                onClick={() => {
                                  setQueryParams(p => ({ ...p, filters: p.filters.filter((_, i) => i !== idx) }));
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          
                          <button 
                            className="btn btn-secondary w-full"
                            style={{ fontSize: '0.8rem', marginTop: '4px' }}
                            onClick={() => {
                              setQueryParams(p => ({ 
                                ...p, 
                                filters: [...p.filters, { field: '', operator: '', value: '' }] 
                              }));
                            }}
                          >
                            <Plus size={14} /> Add Filter
                          </button>
                        </div>
                        
                        {/* APPLY BUTTON */}
                        <button 
                          className="btn btn-primary w-full mt-2" 
                          onClick={() => {
                            setShowFilterMenu(false);
                            // Set page back to 1 when applying new filters
                            setQueryParams(p => ({ ...p, page: 1 }));
                          }}
                        >
                          Apply Queries
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={fetchData}
                  className="btn btn-secondary btn-icon-only"
                >
                  <RefreshCw
                    size={18}
                    className={loadingData ? "animate-spin" : ""}
                  />
                </button>

                {activeCollection?.name !== 'users' && (
                  <button
                    onClick={() => setIsRlsDialogOpen(true)}
                    className="btn btn-secondary"
                    title="Configure Row Level Security"
                  >
                    <Shield size={16} />
                    <span className="hide-mobile">RLS</span>
                    <span style={{
                      marginLeft: "0.35rem",
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      display: "inline-block",
                      background: activeCollection?.rls?.enabled ? "var(--color-primary)" : "var(--color-border)"
                    }} />
                  </button>
                )}

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="btn btn-primary"
                >
                  <Plus size={18} />
                  <span className="hide-mobile">Add Record</span>
                </button>
              </div>
            </header>

            <div className="db-content">
              {loadingData ? (
                <SkeletonLoader />
              ) : data.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <FileText size={40} />
                  </div>
                  <h3>No data found</h3>
                  <p>Start by adding your first document to this collection.</p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn btn-primary mt-4"
                  >
                    Add Document
                  </button>
                </div>
              ) : viewMode === "list" ? (
                <RecordList
                  data={data}
                  activeCollection={activeCollection}
                  onView={setSelectedRecord}
                />
              ) : viewMode === "table" ? (
                <TableView />
              ) : (
                <JsonView />
              )}
            </div>

            {/* PAGINATION FOOTER */}
            {activeCollection && data.length > 0 && (
              <div className="pagination-footer glass-panel" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 2rem',
                borderTop: '1px solid var(--color-border)',
                background: 'rgba(10, 10, 10, 0.4)',
                backdropFilter: 'blur(10px)',
                zIndex: 10
              }}>
                <div className="flex items-center gap-2">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Rows per page:</span>
                  <select 
                    className="form-input" 
                    value={queryParams.limit}
                    onChange={(e) => {
                      setQueryParams(p => ({ ...p, limit: Number(e.target.value), page: 1 }));
                    }}
                    style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Page {queryParams.page}</span>
                  <div className="flex gap-1">
                    <button 
                      className="btn btn-secondary btn-icon-only"
                      onClick={() => setQueryParams(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                      disabled={queryParams.page === 1}
                      style={{ opacity: queryParams.page === 1 ? 0.5 : 1, cursor: queryParams.page === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      className="btn btn-secondary btn-icon-only"
                      onClick={() => setQueryParams(p => ({ ...p, page: p.page + 1 }))}
                      disabled={data.length < queryParams.limit}
                      style={{ opacity: data.length < queryParams.limit ? 0.5 : 1, cursor: data.length < queryParams.limit ? 'not-allowed' : 'pointer' }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="no-collection-state">
            <button
              className="btn-icon hide-desktop menu-trigger absolute-trigger"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="center-content">
              <DbIcon size={48} className="text-muted mb-4 opacity-20" />
              <h2>Select a Collection</h2>
              <p className="text-muted">
                Choose a collection from the sidebar to manage your data.
              </p>
            </div>
          </div>
        )}
      </main>

      {isAddModalOpen && (
        <AddRecordDrawer
          key={activeCollection?._id}
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRecord(null);
          }}
          onSubmit={editingRecord ? handleUpdateDocument : handleAddDocument}
          fields={activeCollection?.model || []}
          isSubmitting={isSubmitting}
          initialData={editingRecord}
        />
      )}

      {isRlsDialogOpen && activeCollection && activeCollection.name !== 'users' && (
        <div className="rls-dialog-overlay" onClick={() => setIsRlsDialogOpen(false)}>
          <div
            className="rls-dialog slide-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rls-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rls-dialog-header">
              <div className="rls-dialog-title-wrap">
                <Shield size={18} />
                <h3 id="rls-dialog-title">RLS Settings</h3>
              </div>
              <button className="btn-icon" onClick={() => setIsRlsDialogOpen(false)} aria-label="Close RLS dialog">
                <X size={16} />
              </button>
            </div>

            <p className="rls-dialog-subtitle">
              Collection: <strong>{activeCollection.name}</strong> | Mode: <strong>{rlsMode}</strong>
            </p>

            <label className="rls-checkbox-row">
              <input
                type="checkbox"
                checked={rlsEnabled}
                onChange={(e) => setRlsEnabled(e.target.checked)}
                style={{ accentColor: "var(--color-primary)" }}
              />
              <span>Enable RLS access rules for publishable-key requests</span>
            </label>
            <p className="rls-help-text">
              {rlsMode === "private"
                ? "When enabled, publishable-key access is restricted to the owner for both reads and writes."
                : "When enabled, publishable-key writes are restricted to the owner. Reads remain available according to the selected access mode."}
            </p>

            <div className="rls-owner-field-group">
              <label htmlFor="rls-mode">Access Mode</label>
              <select
                id="rls-mode"
                value={rlsMode}
                onChange={(e) => setRlsMode(e.target.value)}
                className="form-input"
              >
                <option value="public-read">public-read (anyone reads, owner writes)</option>
                <option value="private">private (owner reads and writes)</option>
              </select>
              <p className="rls-help-text">
                Use <strong>public-read</strong> for posts/blogs that should be readable by anyone. Use <strong>private</strong> for personal settings and user-owned data.
              </p>
            </div>

            <div className="rls-owner-field-group">
              <label htmlFor="rls-owner-field">Owner Field</label>
              <select
                id="rls-owner-field"
                value={rlsOwnerField}
                onChange={(e) => setRlsOwnerField(e.target.value)}
                className="form-input"
              >
                {rlsOwnerFieldOptions.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
              <p className="rls-help-text">
                `userId` means the field in each document that stores the logged-in user's id.
                Example: `posts.userId` or `orders.ownerId`. For the users collection, `_id` is usually the correct owner field.
              </p>
              <p className="rls-help-text">
                When RLS is enabled, publishable-key writes also require `Authorization: Bearer &lt;user_jwt&gt;`.
              </p>
            </div>

            <div className="rls-dialog-actions">
              <button className="btn btn-secondary" onClick={() => setIsRlsDialogOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={isSavingRls}
                onClick={async () => {
                  const saved = await handleSaveRls();
                  if (saved) setIsRlsDialogOpen(false);
                }}
              >
                {isSavingRls ? "Saving..." : "Save RLS"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
                /* Component Specific Styles */
                .db-layout {
                    display: flex;
                    height: calc(100vh - 56px);
                    width: 100vw;
                    overflow: hidden;
                    background: #050505;
                    position: relative;
                }


                .sidebar-header-area {
                    padding: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .section-title {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--color-text-muted);
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .badge {
                    background: rgba(255,255,255,0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    color: white;
                    font-size: 0.7rem;
                }
                
                .collection-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                }

                .collection-item {
                    padding: 8px 12px;
                    margin-bottom: 4px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    color: var(--color-text-muted);
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                
                .collection-item:hover .btn-icon {
                    opacity: 1;
                }
                
                .flex { display: flex; }
                .items-center { align-items: center; }
                .gap-3 { gap: 0.75rem; }
                .gap-2 { gap: 0.5rem; }
                .ml-auto { margin-left: auto; }
                .shrink-0 { flex-shrink: 0; }
                .overflow-hidden { overflow: hidden; }
                .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }


                .collection-item:hover {
                    background: rgba(255,255,255,0.03);
                    color: var(--color-text-main);
                }

                .collection-item.active {
                    background: rgba(62, 207, 142, 0.1);
                    color: var(--color-primary);
                    border-color: rgba(62, 207, 142, 0.2);
                }

                /* Main Content Area */
                .db-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    min-width: 0; /* Critical for flex child scrolling */
                    background: #0A0A0A;
                    margin: 16px 16px 16px 0;
                    border: 1px solid #1A1A1A;
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                }

                .db-header {
                    padding: 1rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--color-border);
                    z-index: 100;
                    position: relative;
                    flex-shrink: 0; /* Prevent header from collapsing */
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .breadcrumbs {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                    color: var(--color-text-muted);
                    margin-bottom: 4px;
                }
                
                .header-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 0;
                    line-height: 1.2;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .db-content {
                    flex: 1;
                    overflow: hidden; /* For table scroll */
                    padding: 0;
                    position: relative;
                    min-width: 0; /* Critical for flex child scrolling */
                }

                /* Table Styling */
                .table-container {
                    height: 100%;
                    overflow: auto;
                    width: 100%;
                }

                .tanstack-table {
                    border-collapse: separate;
                    border-spacing: 0;
                    table-layout: fixed;
                    min-width: 100%;
                }

                .tanstack-table th {
                    box-sizing: border-box;
                    background: var(--color-bg-card);
                    position: sticky;
                    top: 0;
                    z-index: 5;
                    padding: 12px 16px;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--color-text-muted);
                    border-bottom: 1px solid var(--color-border);
                    border-right: 1px solid var(--color-border);
                }

                .tanstack-table td {
                    box-sizing: border-box;
                    padding: 0; /* Removing padding from td to let inner div handle it */
                    background: transparent;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    border-right: 1px solid rgba(255,255,255,0.05);
                    font-size: 0.9rem;
                    transition: background 0.2s;
                }
                
                .cell-content {
                    padding: 12px 16px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                    display: block;
                }

                .resizer {
                    position: absolute;
                    right: 0;
                    top: 0;
                    height: 100%;
                    width: 5px;
                    background: rgba(255, 255, 255, 0.1);
                    cursor: col-resize;
                    user-select: none;
                    touch-action: none;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .tanstack-table th:hover .resizer,
                .resizer.isResizing {
                    opacity: 1;
                    background: var(--color-primary);
                }

                .tanstack-table th:last-child,
                .tanstack-table td:last-child {
                    border-right: none;
                }

                .table-row:hover td {
                    background: rgba(255,255,255,0.02);
                }

                
                .type-badge {
                    font-size: 0.65rem;
                    background: rgba(255,255,255,0.08);
                    padding: 2px 5px;
                    border-radius: 3px;
                    margin-left: 8px;
                    color: #aaa;
                    text-transform: none;
                }

                /* View Toggle */
                .view-toggle {
                    background: rgba(255,255,255,0.05);
                    padding: 3px;
                    border-radius: 6px;
                    display: flex;
                    gap: 2px;
                }

                .toggle-btn {
                    padding: 6px;
                    border: none;
                    background: transparent;
                    color: var(--color-text-muted);
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                }

                .toggle-btn.active {
                    background: var(--color-bg-card);
                    color: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }

                /* Empty & Loading States */
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--color-text-muted);
                }

                .empty-icon-wrapper {
                    background: rgba(255,255,255,0.03);
                    padding: 2rem;
                    border-radius: 50%;
                    margin-bottom: 1.5rem;
                }

                .skeleton-container {
                    padding: 2rem;
                }
                .skeleton-row {
                    height: 48px;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                }
                .skeleton-text {
                    height: 20px;
                    border-radius: 4px;
                }
                
                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(4px);
                    z-index: 200;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                }

                .modal-content {
                    width: 100%;
                    max-width: 450px;
                    background: #111;
                    border: 1px solid #333;
                    border-radius: 8px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                    overflow: hidden;
                }

                .modal-header {
                    padding: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #222;
                }

                .modal-body {
                    padding: 1.5rem;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 2rem;
                }

                .rls-dialog-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.55);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1200;
                    padding: 1rem;
                }

                .rls-dialog {
                    width: min(520px, 100%);
                    background: rgba(15, 15, 15, 0.95);
                    border: 1px solid var(--color-border);
                    border-radius: 12px;
                    padding: 1rem;
                    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
                }

                .rls-dialog-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }

                .rls-dialog-title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 0.55rem;
                }

                .rls-dialog-title-wrap h3 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 600;
                }

                .rls-dialog-subtitle {
                    margin: 0 0 1rem 0;
                    font-size: 0.85rem;
                    color: var(--color-text-muted);
                }

                .rls-checkbox-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--color-text-muted);
                    font-size: 0.92rem;
                    margin-bottom: 1rem;
                }

                .rls-owner-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .rls-owner-field-group label {
                    font-size: 0.85rem;
                    color: var(--color-text-muted);
                }

                .rls-help-text {
                    margin: 0;
                    font-size: 0.8rem;
                    line-height: 1.45;
                    color: var(--color-text-muted);
                }

                .rls-dialog-actions {
                    margin-top: 1rem;
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                }
                
                .field-type-hint {
                    float: right;
                    font-size: 0.7rem;
                    background: rgba(255,255,255,0.1);
                    padding: 2px 6px;
                    border-radius: 3px;
                }

                /* Mobile Response */
                @media (max-width: 768px) {
                    .db-sidebar {
                        position: absolute;
                        height: 100%;
                        transform: translateX(-100%);
                        box-shadow: 5px 0 15px rgba(0,0,0,0.5);
                    }
                    .db-sidebar.open {
                        transform: translateX(0);
                    }
                    .sidebar-backdrop.active {
                        position: absolute;
                        inset: 0;
                        background: rgba(0,0,0,0.5);
                        z-index: 50;
                        backdrop-filter: blur(2px);
                    }
                    .db-header {
                        padding: 1rem;
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    .header-left {
                        width: 100%;
                    }
                    .header-actions {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .record-count {
                        display: none;
                    }
                }
                
                .json-pre {
                    padding: 1.5rem;
                    color: #3ECF8E;
                    font-family: 'Fira Code', monospace;
                    font-size: 0.85rem;
                    overflow: auto;
                    height: 100%;
                    white-space: pre-wrap;
                    word-break: break-all;
                }
                
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                
                .slide-up {
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .no-collection-state {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .absolute-trigger {
                    position: absolute;
                    top: 1rem;
                    left: 1rem;
                    z-index: 20;
                }
                .center-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .opacity-20 { opacity: 0.2; }
                .text-muted { color: var(--color-text-muted); }
                .mb-4 { margin-bottom: 1rem; }
            `}</style>
    </div>
  );
}
