import path from "path";

export const isValidImage = (image: string): boolean => {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".PNG", ".JPG", ".JPEG"];
  const fileExtension = path.extname(image).toLowerCase();

  return allowedExtensions.includes(fileExtension);
};
