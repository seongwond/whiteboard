# 🎨 실시간 협업 화이트보드 (Real-time Collaborative Whiteboard)

여러 사용자가 동시에 접속하여 그림을 그리고 아이디어를 공유할 수 있는 **실시간 웹 화이트보드 애플리케이션**입니다.
Next.js의 최신 기능과 Socket.io의 강력한 실시간 통신 기능을 결합하여 끊김 없는 협업 경험을 제공합니다.

이 프로젝트는 바이브 코딩만으로 제작되었습니다.

## 🛠 기술 스택 (Tech Stack)

이 프로젝트는 최신 웹 기술 트렌드를 반영하여 설계되었습니다.

### Frontend
- **Next.js 14 (App Router)**: 서버 사이드 렌더링(SSR)과 최신 라우팅 시스템을 활용하여 빠른 초기 로딩과 SEO 최적화를 구현했습니다.
- **TypeScript**: 정적 타입 시스템을 도입하여 코드의 안정성을 높이고 런타임 에러를 사전에 방지했습니다.
- **TailwindCSS**: 유틸리티 퍼스트 CSS 프레임워크를 사용하여 직관적이고 빠른 UI 스타일링을 적용했습니다.
- **React-Konva**: HTML5 Canvas API를 React 컴포넌트 방식으로 쉽게 다룰 수 있게 해주는 라이브러리로, 복잡한 드로잉 로직을 선언적으로 구현했습니다.
- **Lucide React**: 깔끔하고 일관된 디자인의 아이콘을 사용하여 직관적인 사용자 인터페이스(UI)를 구성했습니다.

### Backend & Real-time
- **Custom Express Server**: Next.js의 기본 서버 대신 커스텀 Express 서버를 구축하여 WebSocket 연결을 유연하게 제어했습니다.
- **Socket.io**: 클라이언트와 서버 간의 양방향 실시간 통신을 담당하며, 사용자의 드로잉 데이터를 지연 없이 다른 사용자에게 전송합니다.

## ✨ 주요 기능 (Key Features)

- **실시간 동기화**: Socket.io를 통해 모든 사용자의 드로잉 작업이 밀리초 단위로 동기화됩니다.
- **다양한 그리기 도구**:
  - ✏️ **펜 (Pen)**: 자유로운 선 그리기
  - 🧹 **지우개 (Eraser)**: 그린 내용 지우기
  - ⬜ **사각형 (Rectangle)** & ⭕ **원 (Circle)**: 도형 추가
- **스타일 커스터마이징**:
  - 🎨 **색상 선택**: 다양한 색상으로 아이디어를 표현
  - 📏 **선 두께 조절**: 1px부터 20px까지 자유로운 두께 조절
- **실행 취소/다시 실행 (Undo/Redo)**: 실수하더라도 언제든 이전 상태로 되돌릴 수 있는 히스토리 기능을 제공합니다.

## 🚀 시작하기 (Getting Started)

### 설치 및 실행

1. 저장소를 클론합니다.
   ```bash
   git clone https://github.com/seongwond/whiteboard.git
   cd whiteboard
   ```

2. 패키지를 설치합니다.
   ```bash
   npm install
   ```

3. 개발 서버를 실행합니다.
   ```bash
   npm run dev
   ```

4. 브라우저에서 `http://localhost:3000`으로 접속하여 화이트보드를 사용해보세요!

## 🤝 기여하기 (Contributing)

이 프로젝트는 포트폴리오 목적으로 제작되었으나, 개선 제안이나 버그 제보는 언제나 환영합니다. Issue나 Pull Request를 통해 참여해 주세요.
