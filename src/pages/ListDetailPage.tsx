import { useParams } from 'react-router-dom'

export default function ListDetailPage() {
  const { id } = useParams()

  return (
    <div>
      <h1 className="text-2xl font-semibold">List Detail</h1>
      <p className="mt-2 text-gray-600">Viewing list: {id}</p>
    </div>
  )
}
