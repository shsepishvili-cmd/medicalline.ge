export default function handler(req, res) {
  // აქ ხელით ჩაწერე "blocked" როცა გინდა რომ დაიბლოკოს
  // ან "active" როცა გინდა რომ იმუშაოს
  res.status(200).json({ status: "blocked" });
}