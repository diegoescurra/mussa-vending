import { useQuery } from "@tanstack/react-query"
import { productosService } from "../services/productos.service"


export const useProductos = () => {
    return useQuery({
        queryKey: ["productos"],
        queryFn: productosService.getAll,
    })
}

export const useProductoOpciones = () => useQuery({
    queryKey: ['productos', 'opciones'],
    queryFn: productosService.getOptions,
});
