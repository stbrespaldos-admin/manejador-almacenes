# Guía de Mantenimiento y Corrección de Base de Datos

Esta guía detalla los procedimientos manuales para corregir errores de escaneo y resetear el sistema durante la fase operativa.

## 1. Corrección de Escaneos Erróneos (MAC en lugar de Serial)

Si un operario escanea la MAC por error y no usa el botón de "Borrar" inmediato en la App, puedes corregirlo manualmente en Supabase:

### Paso a paso manual:
1. Ve a la tabla `onus` y busca el registro por su serial (MAC).
2. **Anota el `box_id`** de ese registro.
3. Elimina la fila de la tabla `onus`.
4. Ve a la tabla `boxes` y busca la caja con ese `id`.
5. Resta 1 al valor de `current_onu_count`.
6. Si el nuevo valor es 0, cambia `status` a `empty`. Si era 20, cámbialo a `partial`.

### Vía SQL (Recomendado):
```sql
-- Reemplaza 'CODIGO_ERRONEO' por el valor real
DELETE FROM onus WHERE serial = 'CODIGO_ERRONEO';

-- El sistema de la app está diseñado para que el contador se base 
-- en la tabla boxes, por lo que debes ajustarla:
UPDATE boxes 
SET current_onu_count = current_onu_count - 1,
    status = CASE WHEN current_onu_count - 1 = 0 THEN 'empty' ELSE 'partial' END
WHERE id = 'ID_DE_LA_CAJA';
```

---

## 2. Reset Total (Para empezar producción desde cero)

Si deseas borrar todas las pruebas y que los contadores (UNIT ID) vuelvan a empezar en 1:

```sql
-- 1. Borrar registros de equipos y movimientos
DELETE FROM public.onus;
DELETE FROM public.movements;

-- 2. Resetear contadores y estados de todas las cajas
UPDATE public.boxes 
SET current_onu_count = 0, 
    status = 'empty';
```

---

## 3. Reset de una Caja Específica

Si solo quieres vaciar la **Caja 1** del **Almacén 1**:

```sql
-- 1. Borrar equipos de esa caja específica
DELETE FROM public.onus 
WHERE box_id IN (
  SELECT id FROM public.boxes 
  WHERE box_number = 1 
  AND warehouse_id = (SELECT id FROM public.warehouses WHERE name = 'Almacén 1')
);

-- 2. Resetear el contador de esa caja
UPDATE public.boxes 
SET current_onu_count = 0, 
    status = 'empty'
WHERE box_number = 1 
AND warehouse_id = (SELECT id FROM public.warehouses WHERE name = 'Almacén 1');
```

---

## 4. Nuevas Funciones de Control en la App

He implementado dos protecciones automáticas:
1. **Validación de Prefijo:** El sistema ahora alerta si se escanea algo que no empieza por `ZTEG` (para modelos ZTE) o si el formato parece una MAC (12 caracteres hexadecimales).
2. **Botón Borrar:** En la pantalla de Recepción, el historial de las últimas 5 interacciones ahora incluye un botón **BORRAR** que elimina el registro y ajusta la caja automáticamente sin necesidad de entrar a la base de datos.
