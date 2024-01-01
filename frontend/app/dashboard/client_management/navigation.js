const rootPath = "/dashboard/client_management"; // this should be based on its relative position

const navigationIndex = [
  {
    name: "View",
    routing: rootPath,
  },
  {
    name: "Create",
    routing: rootPath + "/create",
  },
  {
    name: "Edit",
    routing: rootPath + "/edit",
  },

  {
    name: "Delete",
    routing: rootPath + "/delete",
  },

  ,
];

export { navigationIndex };
