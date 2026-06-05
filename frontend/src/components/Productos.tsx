import { useProductos } from "../hooks/useProductos"


export const Productos = () => {
    const {data, isLoading, isError} =  useProductos();

    if(isLoading) return <div>Cargando...</div>
    if(isError) return <div>Error al cargar los productos</div>

    return (
        <div>
            <h1>Productos</h1>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Precio</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.map((producto) => (
                        <tr key={producto.id_producto}>
                            <td>{producto.id_producto}</td>
                            <td>{producto.nombre}</td>
                            <td>${producto.precio_venta}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
   
    
}