db = db.getSiblingDB("admin");

// Crear usuario root si no existe
db.createUser({
  user: "admin",
  pwd: "bdatos2025",
  roles: [ { role: "root", db: "admin" } ]
});

