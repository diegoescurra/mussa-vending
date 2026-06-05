
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'
import { Productos } from './components/Productos'

function App() {

  return (
    <>
    <QueryClientProvider client={new QueryClient()}>
     <Productos />
    </QueryClientProvider>

    </>
  )
}

export default App
