import "./App.css";
import Install from "./Install";
import StarRating from "./components/StarRating";
import Chatbot from "./components/Chatbot";

function App() {
  return (
    <div className="App">
      <h1>PWA 테스트</h1>
      <Install />
      <StarRating itemId={1} />
      <Chatbot />
    </div>
  );
}

export default App;
