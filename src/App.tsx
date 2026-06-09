import { GuardProvider } from "./context";
import { MainLayout } from "./components/MainLayout";

function App() {
  return (
    <GuardProvider>
      <MainLayout />
    </GuardProvider>
  );
}

export default App;
