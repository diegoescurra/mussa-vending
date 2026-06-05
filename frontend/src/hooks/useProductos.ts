import { useQuery } from "@tanstack/react-query"
import { productosService } from "../services"


export const useProductos = () => {
    return useQuery({
        queryKey: ["productos"],
        queryFn: productosService.getAll,
    })
}