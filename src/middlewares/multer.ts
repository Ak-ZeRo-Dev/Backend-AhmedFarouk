import multer from "multer";
import crypto from "crypto";

const storage = multer.diskStorage({
  filename: (req, file: any, cb) => {
    const uniqueSuffix = Date.now() + "-" + crypto.randomInt(1e9).toString();
    const fileName = file.originalname.split(".")[0].toLowerCase();
    const fileExtension = file.originalname.split(".")[1].toLowerCase();

    cb(null, `${fileName}-${uniqueSuffix}.${fileExtension}`);
  },
});

const fileFilter = (
  req: any,
  file: any,
  cb: (arg0: null, arg1: boolean) => void
) => {
  const allowedExtensions = ["jpg", "jpeg", "png"];
  const fileExtension = file.originalname.split(".").pop().toLowerCase();
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const fileSize = 5242880;

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize,
  },
});
