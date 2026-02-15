import jwt from "jsonwebtoken";

export function adminAuth(req, res, next) {
  try {
    const header = req.headers.authorization; // "Bearer <token>"
    if (!header) return res.status(401).json({ message: "Missing Authorization header" });

    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
      return res.status(401).json({ message: "Invalid Authorization format" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload; // { id, username }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}