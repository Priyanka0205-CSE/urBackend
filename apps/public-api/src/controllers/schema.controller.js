const {
  Project,
  createSchemaApiKeySchema,
  deleteProjectById,
  setProjectById,
  deleteProjectByApiKeyCache,
  getConnection,
  getCompiledModel,
  clearCompiledModel,
  createUniqueIndexes,
  generateApiKey,
} = require("@urbackend/common");
const { z } = require("zod");

const isNamespaceNotFoundError = (err) => {
  return err && (err.code === 26 || /ns not found/i.test(err.message));
};

const dropCollectionIfExists = async (connection, collectionName) => {
  try {
    await connection.db.dropCollection(collectionName);
  } catch (err) {
    if (!isNamespaceNotFoundError(err)) {
      throw err;
    }
  }
};

module.exports.checkSchema = async (req, res) => {
  try {
    const { collectionName } = req.params;
    const project = req.project;

    if (!project) {
      return res.status(401).json({ error: "Project missing from request." });
    }

    const collectionConfig = project.collections.find(
      (c) => c.name === collectionName,
    );

    if (!collectionConfig) {
      return res.status(404).json({ error: "Schema/Collection not found" });
    }

    res
      .status(200)
      .json({ message: "Schema exists", collection: collectionConfig });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports.createSchema = async (req, res) => {
  let fullProject;
  let connection;
  let compiledCollectionName;
  let collectionWasPersisted = false;
  let collectionNameForRollback;

  try {
    const { name, fields } = createSchemaApiKeySchema.parse(req.body);
    collectionNameForRollback = name;
    const project = req.project;
    if (!project) {
      return res.status(401).json({ error: "Project missing from request." });
    }

    const projectId = project._id;
    fullProject = await Project.findById(projectId);

    if (!fullProject)
      return res.status(404).json({ error: "Project not found" });

    const exists = fullProject.collections.find((c) => c.name === name);
    if (exists)
      return res
        .status(400)
        .json({ error: "Collection/Schema already exists" });

    if (!fullProject.jwtSecret) {
      fullProject.jwtSecret = generateApiKey("jwt_");
    }

    // Recursive field transformer (API uses 'name', internal uses 'key')
    function transformField(f) {
      const mappedType =
        f.type.charAt(0).toUpperCase() + f.type.slice(1).toLowerCase();
      const mapped = {
        key: f.name,
        type: mappedType,
        required: f.required === true,
        unique: f.unique === true,
      };

      if (f.ref) mapped.ref = f.ref;

      if (f.items) {
        mapped.items = {
          type:
            f.items.type.charAt(0).toUpperCase() +
            f.items.type.slice(1).toLowerCase(),
        };

        if (f.items.fields) {
          mapped.items.fields = f.items.fields.map((sf) => transformField(sf));
        }
      }

      if (f.fields) {
        mapped.fields = f.fields.map((sf) => transformField(sf));
      }

      return mapped;
    }

    const transformedFields = (fields || []).map((f) => transformField(f));

    compiledCollectionName = fullProject.resources.db.isExternal
      ? name
      : `${fullProject._id}_${name}`;

    fullProject.collections.push({ name, model: transformedFields });
    await fullProject.save();
    collectionWasPersisted = true;

    const collectionConfig = fullProject.collections.find(
      (c) => c.name === name,
    );

    connection = await getConnection(fullProject._id);
    const Model = getCompiledModel(
      connection,
      collectionConfig,
      fullProject._id,
      fullProject.resources.db.isExternal,
    );

    await createUniqueIndexes(Model, collectionConfig.model);

    // Clear redis cache
    await deleteProjectById(projectId.toString());
    await setProjectById(projectId.toString(), fullProject);
    await deleteProjectByApiKeyCache(fullProject.publishableKey);
    await deleteProjectByApiKeyCache(fullProject.secretKey);
    if (req.hashedApiKey) {
      await deleteProjectByApiKeyCache(req.hashedApiKey);
    }

    const projectObj = fullProject.toObject();
    delete projectObj.publishableKey;
    delete projectObj.secretKey;
    delete projectObj.jwtSecret;

    return res
      .status(201)
      .json({ message: "Schema created successfully", project: projectObj });
  } catch (err) {
    try {
      if (fullProject && collectionWasPersisted) {
        fullProject.collections = fullProject.collections.filter(
          (c) => c.name !== collectionNameForRollback,
        );
        await fullProject.save();
      }

      if (connection && compiledCollectionName) {
        clearCompiledModel(connection, compiledCollectionName);
        await dropCollectionIfExists(connection, compiledCollectionName);
      }
    } catch (rollbackErr) {
      console.error("Create schema rollback failed:", rollbackErr);
    }

    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }

    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};
