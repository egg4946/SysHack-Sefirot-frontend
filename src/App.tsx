import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Sefirot - 課題進捗共有
        </h1>
        
        {/* ここに親タスクのブロックを作っていきます */}
        <div className="border-2 border-gray-200 rounded p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">フロントエンド開発 (〇〇日まで)</h2>
            <span className="text-blue-600 font-bold">進捗: 0%</span>
          </div>
          
          {/* 進捗バーのベース */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div className="bg-blue-600 h-4 rounded-full" style={{ width: '0%' }}></div>
          </div>
          
          <p className="text-gray-500 text-sm">ここに子タスクや担当者名が入ります...</p>
        </div>

      </div>
    </div>
  )
}

export default App