import RouterIcon from "@mui/icons-material/Router";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SvgIcon from "@mui/material/SvgIcon";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import AvTimerIcon from "@mui/icons-material/AvTimer";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import PersonalVideoIcon from "@mui/icons-material/PersonalVideo";
import CopyrightIcon from "@mui/icons-material/Copyright";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
const EngineIcon = (props) => {
  return (
    <SvgIcon {...props} viewBox="0 -14.14 122.88 122.88">
      <path d="M43.58,92.2L31.9,80.53h-8.04c-2.81,0-5.11-2.3-5.11-5.11v-8.7h-4.87V76.9c0,2.17-1.78,3.95-3.95,3.95H3.95 C1.78,80.85,0,79.07,0,76.9V42.4c0-2.17,1.78-3.95,3.95-3.95h5.98c2.17,0,3.95,1.78,3.95,3.95v10.18h4.87v-9.36 c0-2.81,2.3-5.11,5.11-5.11h8.54l12.07-12.83c1.4-1.22,3.26-1.65,5.43-1.56h49.73c1.72,0.19,3.03,0.85,3.83,2.09 c0.8,1.22,0.67,1.91,0.67,3.28v23.49H109V42.4c0-2.17,1.78-3.95,3.95-3.95h5.98c2.17,0,3.95,1.78,3.95,3.95v34.5 c0,2.17-1.78,3.95-3.95,3.95h-5.98c-2.17,0-3.95-1.78-3.95-3.95V66.72h-4.87v0.92c0,2.73,0.08,4.38-1.66,6.64 c-0.33,0.43-0.7,0.84-1.11,1.22L83.53,92.96c-0.89,0.99-2.24,1.53-4.02,1.63h-30.4C46.84,94.49,44.99,93.71,43.58,92.2L43.58,92.2z M63.71,61.78l-12.64-1.19l10.48-22.96h14.33l-8.13,13.17l14.62,1.62L55.53,84.64L63.71,61.78L63.71,61.78z M51.98,0h34.5 c2.17,0,3.95,1.78,3.95,3.95v5.98c0,2.17-1.78,3.95-3.95,3.95H76.3v5.03H62.16v-5.03H51.98c-2.17,0-3.95-1.78-3.95-3.95V3.95 C48.03,1.78,49.81,0,51.98,0L51.98,0z" />
    </SvgIcon>
  );
};

const rootPath = "/dashboard"; // this should be based on its relative position

const navigationIndex = [
  {
    name: "Dashboard",
    icon: QueryStatsIcon,
    routing: rootPath,
  },
  {
    name: "Engine Management",
    icon: EngineIcon,
    routing: rootPath + "/engine_management",
  },
  {
    name: "Client Management",
    icon: RouterIcon,
    routing: rootPath + "/client_management",
  },
  {
    name: "Realtime Status",
    icon: AvTimerIcon,
    routing: rootPath + "/realtime_status",
  },
  {
    name: "divider",
    number: 1,
  },
  {
    name: "System",
    icon: PersonalVideoIcon,
    routing: rootPath + "/system",
  },
  {
    name: "divider",
    number: 2,
  },
  {
    name: "User Management",
    icon: ManageAccountsIcon,
    routing: rootPath + "/user_management",
  },
  {
    name: "divider",
    number: 3,
  },
  {
    name: "Browse Log",
    icon: ManageSearchIcon,
    routing: rootPath + "/browse_log",
  },
  {
    name: "divider",
    number: 4,
  },
  {
    name: "Time Zone",
    icon: AccessTimeIcon,
    routing: rootPath + "/timezone",
  },
  {
    name: "divider",
    number: 5,
  },
  {
    name: "Copyright",
    icon: CopyrightIcon,
    routing: rootPath + "/license",
  },
];

export { navigationIndex };
