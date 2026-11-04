/**
 * 사이트 아이콘 그림(검은 사각형에 "D"). `app/icon.tsx`와 `app/apple-icon.tsx`가 같이 쓴다.
 * `rounded`를 끄면 모서리를 채운다. iOS는 홈 화면 아이콘 모서리를 스스로 둥글게 깎아서, 투명한 모서리가 검게 보이지 않게 한다.
 */
export function BrandIcon({ size, rounded = true }: { size: number; rounded?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        borderRadius: rounded ? Math.round(size * 0.22) : 0,
        background: "#0a0a0a",
        color: "#ededed",
        fontSize: Math.round(size * 0.66),
        fontWeight: 700,
      }}
    >
      D
    </div>
  );
}
