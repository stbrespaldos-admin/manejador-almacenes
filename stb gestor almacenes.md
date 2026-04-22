# **PRD — APLICACIÓN WMS (Warehouse Box Manager)**

---

## **1\. *Rol del Asistente (Meta Prompting)***

Eres un desarrollador de software experto de clase mundial en React, TypeScript, Tailwind CSS, Supabase, VITE y en el entorno nativo de Lovable. Tu enfoque debe ser construir la aplicación con la máxima precisión y adherencia estricta a todas las restricciones de diseño y técnicas proporcionadas.

---

## **2\. *Descripción General y Visión***

Aplicación de gestión de almacenes (WMS simplificado) enfocada en el control preciso de inventario basado en **cajas que contienen ONUs (20 unidades por caja)**.

El sistema será utilizado por operarios de bodega, supervisores y gerencia para controlar el flujo de inventario entre **dos almacenes (sucursales)**, con una interfaz altamente visual basada en una matriz de cajas.

El objetivo es eliminar ambigüedad operativa, asegurar trazabilidad básica y permitir control en tiempo real mediante escaneo desde dispositivos móviles.

**Objetivo principal (MVP):**  
 Entregar un sistema funcional que permita:

* Registrar ONUs mediante escaneo y llenar cajas automáticamente (20 unidades)  
* Visualizar inventario en matriz 5x4 por almacén  
* Transferir cajas completas entre almacenes  
* Consumir ONUs en almacén secundario mediante escaneo  
* Mostrar estado de cajas (completa, parcial, vacía/spent)  
* Visualizar totales de ONUs por almacén  
* Exportar inventario a Excel

---

## **3\. *Stack y Restricciones Técnicas***

Frontend: React, TypeScript, utilizando Tailwind CSS para estilos.  
 Diseño: Estrategia Mobile-First con breakpoints estándar de Tailwind y ShadCN.

Backend: Supabase (PostgreSQL), autenticación, almacenamiento.

Restricciones:

* Aplicación privada (sin exposición pública de datos)  
* Alta precisión de datos (no ambigüedad en operaciones)  
* Interfaz optimizada para uso en tablet y móvil (escaneo)

---

## **4\. *Arquitectura de Datos y Flujo***

### **Modelos de Datos Clave:**

**users**

* id  
* email  
* password  
* role (admin, operador, supervisor)

**warehouses**

* id  
* name (Almacén 1, Almacén 2\)

**boxes**

* id  
* warehouse\_id  
* box\_number (1–20)  
* status (full, partial, spent, empty)  
* current\_onu\_count (0–20)  
* created\_at

**onus**

* id  
* serial (consecutivo)  
* model  
* mac  
* status (warehouse\_1, warehouse\_2, field)  
* box\_id

**movements**

* id  
* type (ingreso, transferencia, consumo, ajuste)  
* from\_warehouse  
* to\_warehouse  
* box\_id (nullable)  
* quantity  
* created\_at  
* user\_id

---

## **5\. *Flujo de Usuario Detallado***

### **Pantallas/Páginas:**

1. Login  
2. Dashboard Almacén 1  
3. Dashboard Almacén 2  
4. Escaneo / Registro de ONUs  
5. Transferencia de cajas  
6. Historial de movimientos  
7. Exportación de datos

---

### **Navegación:**

**Login → Selección de almacén → Dashboard**

---

### **Flujo principal:**

#### **1\. Registro de ONUs (Almacén 1\)**

* Usuario escanea ONUs una por una  
* El sistema:  
  * Asigna automáticamente a la caja disponible  
  * Llena secuencialmente (20 ONUs por caja)  
* Cuando una caja llega a 20:  
  * Estado → FULL  
  * Se pasa a la siguiente caja

---

#### **2\. Visualización**

* Matriz 5x4 (20 cajas)  
* Cada caja muestra:  
  * Número de caja  
  * Cantidad actual  
  * Estado visual (color)  
* Contador total de ONUs por almacén (destacado)

---

#### **3\. Transferencia**

* Usuario selecciona caja completa  
* Acción: “Transferir a Almacén 2”  
* Resultado:  
  * Caja desaparece de Almacén 1  
  * Aparece en Almacén 2

---

#### **4\. Consumo (Almacén 2\)**

* ONUs se consumen mediante escaneo  
* Cada escaneo:  
  * Reduce 1 unidad de la caja  
* Cuando llega a 0:  
  * Estado → SPENT  
  * Caja no reutilizable

---

#### **5\. Reposición**

* Cuando hay menos cajas disponibles:  
  * Operador transfiere nuevas cajas desde Almacén 1

---

#### **6\. Estados de cajas**

* FULL (20)  
* PARTIAL (1–19)  
* SPENT (0, bloqueada)  
* EMPTY (en proceso de llenado)

---

## **6\. *Funcionalidades Clave y Orden de Implementación***

### **Implementación en orden:**

1. Diseño frontend  
2. Conexión backend  
3. Integraciones/lógica de negocio

---

### **Funcionalidades:**

* Autenticación (email/password)  
* Dashboard visual por almacén  
* Matriz de cajas 5x4  
* Escaneo de códigos de barras (ONUs)  
* Llenado automático de cajas  
* Transferencia de cajas completas  
* Consumo por escaneo  
* Estados visuales de cajas  
* Contador total de ONUs por almacén  
* Historial de movimientos  
* Exportación a Excel  
* Alertas de stock mínimo

---

## **7\. *Integraciones y Lógica Externa***

* Supabase Auth (login)  
* Supabase DB (PostgreSQL)  
* Exportación a Excel (client-side o función backend)  
* Escaneo mediante cámara del dispositivo (API nativa del navegador)

No se requieren APIs externas adicionales.

---

## **8\. *Lineamientos de Diseño UI/UX***

* Estilo claro, limpio y funcional  
* Inspirado en “Warehouse Box Manager”  
* Enfoque en claridad operativa

### **Componentes clave:**

* Grid de cajas (tipo tarjetas)  
* Botones \+ / \- (solo visual si aplica)  
* Indicadores numéricos grandes  
* Estados visuales por color:  
  * Verde: lleno  
  * Amarillo: parcial  
  * Gris: spent

### **UX:**

* Minimizar clicks  
* Flujo directo desde escaneo  
* Feedback inmediato en cada acción

### **Responsive:**

* Mobile-first obligatorio  
* Optimizado para tablets

---

## **9\. *Alcance del Proyecto (Scope)***

### ***Incluido:***

* Gestión de 2 almacenes  
* Control de cajas (20 ONUs)  
* Escaneo y registro de ONUs  
* Transferencias entre almacenes  
* Consumo en almacén 2  
* Visualización tipo matriz  
* Totales por almacén  
* Exportación a Excel  
* Alertas básicas

---

### ***Excluido:***

* Gestión de técnicos  
* Integraciones externas (ERP, facturación)  
* Predicciones o IA  
* Auditoría avanzada  
* Multi-empresa  
* Configuración compleja de almacenes

