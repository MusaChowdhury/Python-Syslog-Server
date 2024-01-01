const rootPath = "/dashboard/user_management"; // this should be based on its relative position

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
    name: "Account",
    routing: rootPath + "/account",
  },
  {
    name: "Change Type",
    routing: rootPath + "/change_type",
  },

  {
    name: "Delete",
    routing: rootPath + "/delete",
  },

  ,
];

export { navigationIndex };