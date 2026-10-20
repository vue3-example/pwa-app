import { useEffect, useState } from "react";

// 이미 설치된 앱(독립 실행 모드)으로 열렸는지 확인
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true; // iOS Safari

// 아이폰/아이패드 여부 (iOS 는 beforeinstallprompt 를 지원하지 않음)
const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

const Install = () => {
  // 브라우저가 준 설치 이벤트를 state 에 보관 (null 이면 아직 설치 불가)
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault(); // 브라우저 기본 설치 배너 막기
      setDeferredPrompt(event); // 버튼을 눌렀을 때 쓰려고 저장
    };
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    // 화면에서 사라질 때 리스너 제거 (중복 등록 방지)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); // 설치 팝업 표시 (사용자 클릭 안에서만 가능)
    const { outcome } = await deferredPrompt.userChoice; // "accepted" | "dismissed"
    console.log("설치 선택:", outcome);
    setDeferredPrompt(null); // 프롬프트는 한 번만 사용 가능
  };

  if (installed) return <p>설치된 앱으로 실행 중입니다.</p>;

  return (
    <div>
      <button
        type="button"
        id="install-button"
        onClick={handleInstallClick}
        disabled={!deferredPrompt}
      >
        앱 설치
      </button>
      {isIOS() && (
        <p>아이폰: Safari 의 공유 버튼 → "홈 화면에 추가"를 누르세요.</p>
      )}
    </div>
  );
};

export default Install;
