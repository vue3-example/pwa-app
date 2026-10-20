import { useState } from "react";

// 같은 주소(github.io 계정)의 다른 프로젝트와 키가 겹치지 않도록 앞에 붙이는 이름
const KEY_PREFIX = "pwa-app:rating-";

// 저장된 값을 읽어 0~5 사이 숫자로 돌려줌 (없거나 이상한 값이면 0)
const loadRating = (itemId) => {
  try {
    const n = parseInt(localStorage.getItem(KEY_PREFIX + itemId), 10);
    return n >= 1 && n <= 5 ? n : 0;
  } catch {
    return 0; // 저장소를 쓸 수 없는 환경
  }
};

const StarRating = ({ itemId }) => {
  // 처음 한 번만 저장값을 읽음. 상품이 바뀌는 화면이라면 부모에서 key={itemId} 를 줘서 새로 만들게 함
  const [rating, setRating] = useState(() => loadRating(itemId));

  // 별점 선택 시 저장
  const handleRating = (value) => {
    setRating(value);
    try {
      localStorage.setItem(KEY_PREFIX + itemId, value);
    } catch {
      // 용량 초과·저장 차단 시에도 화면은 동작
    }
  };

  // 별점 초기화
  const resetRating = () => {
    try {
      localStorage.removeItem(KEY_PREFIX + itemId);
    } catch {
      // 무시
    }
    setRating(0);
  };

  return (
    <div>
      <h3>별점 주기</h3>
      <div>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star}점`}
            onClick={() => handleRating(star)}
            style={{
              fontSize: "2rem",
              cursor: "pointer",
              background: "none",
              border: "none",
              color: star <= rating ? "gold" : "gray",
            }}
          >
            ★
          </button>
        ))}
      </div>
      <p>현재 별점: {rating}점</p>
      <button type="button" onClick={resetRating}>
        별점 초기화
      </button>
    </div>
  );
};

export default StarRating;
