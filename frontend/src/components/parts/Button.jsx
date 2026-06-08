export default function Button({ children, style, ...props }) {
  return (
    <button
      {...props}
      style={{
        width: "100%",
        padding: "14px",
        background: "#007bff",
        color: "white",
        border: "none",
        borderRadius: 8,
        fontSize: 16,
        fontWeight: "bold",
        cursor: "pointer",
        boxSizing: "border-box",
        ...style
      }}
    >
      {children}
    </button>
  );
}
