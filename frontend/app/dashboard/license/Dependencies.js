import { Box, Link, Typography } from "@mui/material";

export function Dependencies() {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap:1
        }}
      >
        <Box>
          <Typography fontWeight={"bold"}>
            {`Fast Logger Utilizes Dependencies Mentioned In 'DEPENDENCIES
            LICENSES' File Which You Will Need To Download Using Link Below.`}
          </Typography>
          <Typography color={"red"} fontWeight={"bold"}>
            If You Do Not Agree, Please Discontinue The Use Of The Software
            Immediately.
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Link
            href="/DEPENDENCIES LICENSES.txt"
            download="DEPENDENCIES LICENSES.txt"
          >
            {`Download 'DEPENDENCIES LICENSES'`}
          </Link>
        </Box>
      </Box>
    </>
  );
}
