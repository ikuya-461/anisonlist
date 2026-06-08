export default function Input({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: 8,
        border: "1px solid #ccc",
        fontSize: 16,
        boxSizing: "border-box",
        background: "white",
        ...style
      }}
    />
  );
}
