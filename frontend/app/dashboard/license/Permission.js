import { Box, Typography } from "@mui/material";

export function Permission() {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box>
          <Typography color={"red"}>
            {`By Using This Software, You Are By Default Agreeing With This Software Licensing and Its Dependencies' License Agreement.`}
          </Typography>
          <Typography color={"red"} style={{ fontWeight: "bold" }}>
            {`If You Don't Agree With This or Any of Its Software Agreement, Stop
            Using the Software Immediately and Remove It From the System.`}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography>
            <br></br>
            {`Copyright (c) 2023 Musa Chowdhury`}
            <br></br>
            <br></br>
            {`Permission is hereby granted, free of charge, to any person
            obtaining a copy of this software and associated documentation files
            (the "Software"), to deal in the Software without restriction,
            including without limitation the rights to use, copy, modify, merge,
            publish, distribute, sublicense, and/or sell copies of the Software,
            and to permit persons to whom the Software is furnished to do so,
            subject to the following conditions:`}
            <br></br>
            <br></br>

            {`The above copyright notice and this permission notice shall be
                included in all copies or substantial portions of the Software.`}
            <br></br>
            <br></br>

            {`THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
            NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
            BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
            ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
            CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
            SOFTWARE.`}
          </Typography>
          <Typography color={"red"} style={{ fontWeight: "bold" }}>
            {`The Mentioned License Applies Only to the Fast Logger Software
            Itself. It Does Not Apply to the Dependencies or Any Related Systems
            It Relies On.`}
            <br></br>
            <br></br>
          </Typography>
        </Box>
      </Box>
    </>
  );
}
