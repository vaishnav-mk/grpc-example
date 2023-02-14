const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");
const { randomString, randomInt } = require("./utils/funcs");

const packageDefinition = protoLoader.loadSync("file.proto", {});
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const { filePackage } = grpcObject;

const storage = process.argv[2] || "files";
if (!fs.existsSync(storage)) {
  console.log(`Creating folder ${storage}`);
  fs.mkdirSync(storage);
}
const folder = path.join(__dirname, storage);

const upload = (call, callback) => {
  const { fileName, content, overwrite } = call.request;
  const files = fs.readdirSync(folder);
  const name =
    files.includes(fileName) && !overwrite
      ? `${fileName}.${randomString(5)}.txt`
      : `${fileName}.txt`;
  const filePath = path.join(folder, name);

  try {
    fs.writeFileSync(filePath, content);
  } catch (err) {
    callback(err);
  }
  callback(null, { success: true, fileName: name });
};

const download = (call) => {
  const { fileName } = call.request;
  const filepath = path.join(folder, `${fileName}.txt`);

  fs.readFile(filepath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        call.emit("error", {
          code: grpc.status.NOT_FOUND,
          message: "File not found",
        });
      } else {
        call.emit("error", err);
      }
    } else {
      call.write({ content });
      call.end();
    }
  });
};

const read = (call) => {
  const files = fs.readdirSync(folder);
  files.forEach((fileName) => {
    call.write({ fileName });
  });
  call.end();
};

const remove = (call, callback) => {
  const files = fs.readdirSync(folder);
  const { fileName } = call.request;
  fileName = `${fileName}.txt`;
  const filepath = path.join(folder, fileName);

  if (files.includes(fileName)) {
    try {
      fs.unlinkSync(filepath);
    } catch (err) {
      callback(err);
    }
    callback(null, { success: true });
  } else {
    callback({
      code: grpc.status.NOT_FOUND,
      message: "File not found",
    });
  }
};

const server = new grpc.Server();

server.addService(filePackage.FileService.service, {
  upload,
  download,
  read,
  remove,
});

server.bindAsync(
  "localhost:50051",
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error(error);
      return;
    }
    console.log(
      `Registered functions: ${Object.keys(
        filePackage.FileService.service
      ).join(", ")}`
    );
    server.start();
    console.log(`Server started on port ${port}`);
  }
);
