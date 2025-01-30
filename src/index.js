import dotenv from "dotenv";
// import cluster from "node:cluster"
import os from "os"
// const numCpu = os.cpus().length;
import app from "./app.js";

dotenv.config({
  path: "./env",
});

// if (cluster.isPrimary) {
//   for (let num = 0; num < numCpu; num++) {
//     cluster.fork()
//   }
// } else {
//   connectionDB().then(() => {
//     app.listen(process.env.SERVER_PORT, () => {
//       console.log(`Server Running At PORT:${process.env.SERVER_PORT}`);
//     })
//   }).catch((error) => {
//     console.log("some issue on database connection", error)
//   })
// }

// connect

app.listen(process.env.SERVER_PORT, () => {
  console.log(`Server Running At PORT:${process.env.SERVER_PORT}`);
})

process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("uncaughtException Accured ! Shutting Down Server !");
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("unhandledRejection Accured ! Shutting Down Server !");
  process.exit(1);
});