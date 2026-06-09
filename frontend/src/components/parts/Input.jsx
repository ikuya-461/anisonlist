import styles from "../../CSS/ComponentCSS/Input.module.css";

export default function Input({ className, ...props }) {
  return (
    <input
      {...props}
      className={`${styles.input}${className ? ` ${className}` : ""}`}
    />
  );
}
