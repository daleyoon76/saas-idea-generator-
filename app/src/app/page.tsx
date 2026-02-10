import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          SaaS 사업기획안 도출
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          AI가 유망한 SaaS/Agent 아이디어를 발굴하고
          <br />
          상세 사업기획서를 자동으로 작성합니다
        </p>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            워크플로우
          </h2>
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-800">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                1
              </div>
              <span>키워드 입력</span>
            </div>
            <div className="text-gray-300">→</div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                2
              </div>
              <span>아이디어 3개 도출</span>
            </div>
            <div className="text-gray-300">→</div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                3
              </div>
              <span>아이디어 선택</span>
            </div>
            <div className="text-gray-300">→</div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                4
              </div>
              <span>사업기획서 작성</span>
            </div>
          </div>
        </div>

        <Link
          href="/workflow"
          className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
        >
          시작하기
        </Link>

        <div className="mt-12 text-sm text-gray-700">
          <p>* Ollama가 로컬에서 실행 중이어야 합니다</p>
          <p className="mt-1">
            <code className="bg-gray-100 px-2 py-1 rounded">
              ollama serve
            </code>
          </p>
        </div>
      </main>
    </div>
  );
}
