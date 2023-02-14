const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const chalk = require("chalk");

const packageDefinition = protoLoader.loadSync("file.proto", {});
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const { filePackage } = grpcObject;

const client = new filePackage.FileService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

console.log(chalk.blue("Welcome to the file service client"));

const upload = (fileName, content) => {
  const stream = client.upload({ fileName, content }, (error, response) => {
    if (error) {
      console.log(chalk.red("File upload failed"));
      console.log(chalk.red(error.message));
      return;
    }
    if (response.success) {
      console.log(chalk.green("File uploaded successfully"));
    }
  });
};

const download = (fileName) => {
  const stream = client.download({ fileName });

  stream.on("data", (data) => {
    console.log(chalk.bgWhite("---------------------------------"));
    console.log(Buffer.from(data.content).toString());
  });

  stream.on("end", () => {
    console.log(chalk.bgWhite("---------------------------------"));
  });

  stream.on("error", (error) => {
    if (error.code === grpc.status.NOT_FOUND) {
      console.log(chalk.red("File not found"));
    } else {
      console.error(chalk.red({ error }));
    }
  });
};

const read = () => {
  const stream = client.read();

  const files = [];

  stream.on("data", (data) => {
    files.push(data.fileName);
  });

  stream.on("end", () => {
    console.log(
      chalk.bgGreen(`(${files.length})`) +
        chalk.bgWhite(` file${files.length > 1 ? "s" : ""} found `)
    );
    console.log("---------------------------------");
    files.forEach((fileName, i) => {
      console.log(chalk.green(`[${i + 1}]. `) + chalk.white(`${fileName}`));
    });
    console.log("---------------------------------");
  });

  stream.on("error", (error) => {
    console.error(chalk.red({ error }));
  });
};

const remove = (fileName) => {
  client.remove({ fileName }, (error, response) => {
    if (error) {
      console.error(chalk.red(error.message));
      return;
    }
    if (response?.success) {
      console.log(chalk.green("File removed successfully"));
    }
  });
};

//todo: cli