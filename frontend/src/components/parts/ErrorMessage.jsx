export default function ErrorMessage({ children }) {
  if (!children) return null;

  return (
    <div style={{ color: "red", marginBottom: 10, fontSize: 14 }}>
      {children}
    </div>
  );
}
