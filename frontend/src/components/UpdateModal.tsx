type Props = {
  version: string;
  apkUrl: string;
};

export default function UpdateModal({
  version,
  apkUrl
}: Props) {

  return (

    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.8)",
        zIndex: 9999
      }}
    >

      <div
        style={{
          background: "white",
          padding: "20px",
          margin: "100px auto",
          width: "300px"
        }}
      >

        <h2>Update Available</h2>

        <p>
          New Version: {version}
        </p>

        <button
          onClick={() =>
            window.open(apkUrl)
          }
        >
          Download Update
        </button>

      </div>

    </div>

  );

}