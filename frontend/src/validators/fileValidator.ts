export const validateImage = (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png"];    // to manage supabase storage efficiently

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Only JPG and PNG images are allowed");
    }

    if (file.size > 2 * 1024 * 1024) {
        throw new Error("Image must be less than 2MB");
    }
};