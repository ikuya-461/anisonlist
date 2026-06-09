import styles from "./Button.module.css";

export default function Button({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={`${styles.btn}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}
