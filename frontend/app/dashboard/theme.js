export function getPallet(dark = false) {
    if (!dark) {
      return {
        palette: {
          mode: "light",
          primary: {
            main: "#60a5fa",
            light: "#054696",
          },
        },
      };
    } else {
      return {
        palette: {
          mode: "dark",
        },
      };
    }
  }