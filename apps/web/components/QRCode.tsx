import QRCodeLib from "qrcode";

interface Props {
  url: string;
  size?: number;
}

export default async function QRCode({ url, size = 120 }: Props) {
  let svg = "";
  try {
    svg = await QRCodeLib.toString(url, {
      type: "svg",
      width: size,
      margin: 1,
      color: { dark: "#1A1A2E", light: "#FFFFFF" }
    });
  } catch {
    // Fallback placeholder if QR generation fails
    return (
      <div
        style={{
          width: size,
          height: size,
          margin: "0 auto",
          background: "rgba(45,90,39,0.06)",
          border: "2px dashed rgba(45,90,39,0.2)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2D5A27",
          fontSize: "0.72rem",
          fontWeight: 600
        }}
      >
        QR unavailable
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-block",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(74,85,104,0.12)"
      }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
