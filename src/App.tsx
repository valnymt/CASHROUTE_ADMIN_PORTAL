import { Navigate, Route, Routes } from 'react-router-dom'
import Stage from './components/Stage'
import { screens } from './routes'

export default function App() {
  return (
    <Routes>
      {screens.map(({ path, Component }) => (
        <Route
          key={path}
          path={path}
          element={
            <Stage>
              <Component />
            </Stage>
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
