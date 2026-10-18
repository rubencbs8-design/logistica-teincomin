# Logística TEINCOMIN — Plan Estratégico (2027–2029) y Plan Táctico (Nov 2026 – Dic 2027)

**Alcance:** almacén de mina (aceros, EPP, repuestos Jackleg/Stoper, equipo Alimak, herramientas, lubricantes, seguridad, oficina), entrega y control de EPP, pedidos de guardia y el sistema Logística TEINCOMIN (app + hoja de Google + Apps Script + Power BI).

**Marco legal:** Ley 29783 y su reglamento (DS 005-2012-TR); DS 024-2016-EM y su modificatoria DS 023-2017-EM (Reglamento de SSO en Minería); RM 050-2013-TR (registros obligatorios: equipos de seguridad o emergencia); normas técnicas de EPP aplicables (NTP / ANSI / EN según el ítem).

> Los valores de línea base marcados "medir" se completan en el primer mes del plan táctico (T0). Las metas son propuestas para validar con Gerencia y SSOMA.

---

## 1. Plan Estratégico 2027–2029

### 1.1 Misión del área
Abastecer a tiempo a cada labor con los materiales y EPP correctos, con trazabilidad completa (quién, qué, cuándo, dónde, con firma) y al menor costo total, cumpliendo la normativa de SSO.

### 1.2 Visión 2029
Almacén de mina 100 % digital, sin quiebres de stock en ítems críticos, con cada trabajador protegido con EPP vigente y su registro auditable en segundos, y con el costo de consumo controlado por labor, guardia y trabajador.

### 1.3 Diagnóstico (FODA resumido)

| Fortalezas | Debilidades |
|---|---|
| Sistema propio operativo: vales, kardex de costo promedio, anulación sin borrado | Stock mínimo no definido en todos los ítems (filtro "Reponer" depende de `min`) |
| Firma digital del trabajador (almacén o celular) y kardex FO-SI-057 en PDF a Drive | Ítems con stock sin costo (KPI "sin costo") → consumo valorizado incompleto |
| Alertas de renovación de EPP a 30 días | Personal con "SIN-DNI" y tallas incompletas |
| Funciona sin señal (cola de vales/pedidos) | Dependencia de una hoja de Google y de una sola persona que conoce el sistema |
| Roles definidos (ADMIN, LOGÍSTICO, SEGURIDAD, SOLICITANTE, LECTURA) | Sin indicadores formales de nivel de servicio ni de exactitud de inventario |

| Oportunidades | Amenazas |
|---|---|
| Power BI para consumo valorizado por labor/guardia/trabajador | Fiscalización SUNAFIL / OSINERGMIN: EPP sin registro firmado = infracción |
| Negociar con proveedores con datos reales de consumo | Quiebre de aceros o EPP críticos → parada de labor o trabajador expuesto |
| Estandarizar EPP por puesto (matriz IPERC → EPP) | Pérdida de datos o acceso (credenciales, cuenta Google) |
| Replicar el modelo en otras unidades/clientes | Rotación de personal de almacén y de jefes de guardia |

### 1.4 Objetivos estratégicos, indicadores y metas

| # | Objetivo | Indicador (KPI) | Base | Meta 2027 | Meta 2029 |
|---|---|---|---|---|---|
| OE1 | Cero trabajadores con EPP vencido o sin registro | % trabajadores activos con EPP vigente y firmado | medir | ≥ 95 % | 100 % |
| OE1 | | Renovaciones vencidas sin atender (> 7 días) | medir | ≤ 2 % | 0 |
| OE2 | Disponibilidad de materiales críticos | Quiebres de stock en ítems críticos / mes | medir | ≤ 2 | 0 |
| OE2 | | Pedidos atendidos en ≤ 1 guardia (fill rate) | medir | ≥ 90 % | ≥ 98 % |
| OE3 | Exactitud de inventario | Exactitud de inventario cíclico (ítems sin diferencia) | medir | ≥ 95 % | ≥ 99 % |
| OE3 | | Valor de ajustes / valor de inventario | medir | ≤ 1 % | ≤ 0,3 % |
| OE4 | Control de costos | Ítems con stock y sin costo | medir | 0 | 0 |
| OE4 | | Costo de EPP por trabajador-mes y aceros por m avanzado | medir | definir base | −10 % vs. 2027 |
| OE4 | | Rotación de inventario / días de cobertura | medir | definir política | según política por grupo |
| OE5 | Continuidad y gobierno del sistema | Respaldos verificados / mes; personas capacitadas como ADMIN | medir | 4 / mes; ≥ 2 | 4 / mes; ≥ 3 |
| OE6 | Cumplimiento legal y auditoría | Hallazgos de auditoría en registros de EPP | medir | 0 mayores | 0 |

### 1.5 Líneas estratégicas e iniciativas

1. **EPP como control de riesgo, no como despacho** (OE1, OE6)
   - Matriz EPP por puesto derivada del IPERC; vida útil estándar por ítem (fija la fecha de renovación).
   - Entrega 100 % con firma digital; kardex FO-SI-057 en Drive para cada trabajador.
   - Reposición por deterioro con inspección y registro de causa (desgaste, daño, pérdida).
2. **Abastecimiento confiable** (OE2, OE4)
   - Clasificación ABC (valor) × criticidad (impacto en seguridad/producción).
   - Stock mínimo / punto de reorden calculado con consumo real del sistema.
   - Acuerdos marco con proveedores para EPP y aceros con tiempos de entrega comprometidos.
3. **Inventario exacto** (OE3)
   - Inventario cíclico: A mensual, B trimestral, C semestral; inventario general anual.
   - Toda corrección vía "Stock inicial / ajuste" o "Anular", con justificación.
4. **Costos a la vista** (OE4)
   - Tablero Power BI: consumo valorizado por labor, guardia, trabajador y grupo.
   - Revisión mensual de consumo atípico con jefes de guardia.
5. **Sistema robusto y sin dependencia de personas** (OE5)
   - Respaldo semanal de la hoja, control de accesos por rol, PIN personales, manual y runbook.
   - Evaluar migración a base de datos cuando el volumen lo justifique (latencia o límites del Apps Script).

### 1.6 Hoja de ruta

| Año | Foco | Hitos |
|---|---|---|
| 2027 | **Ordenar y medir** | Maestros limpios (personal, productos, costos, mínimos), matriz EPP por puesto, KPIs en Power BI, inventario cíclico instalado |
| 2028 | **Optimizar** | Reposición por punto de reorden, acuerdos marco con proveedores, reducción de costo/consumo, auditoría interna sin hallazgos mayores |
| 2029 | **Escalar** | Modelo replicable en otras unidades/clientes; evaluación de plataforma de datos; integración con planillas/RR. HH. (altas y ceses automáticos) |

### 1.7 Gobierno
- **Dueño del plan:** Jefe de Logística. **Co-dueño OE1/OE6:** Jefe de SSOMA.
- **Revisión:** mensual (KPIs, comité operativo), trimestral (avance táctico, Gerencia de Operaciones), anual (reformulación del plan).

---

## 2. Plan Táctico (Nov 2026 – Dic 2027)

Cada acción tiene responsable, plazo, entregable y criterio de cierre. R = responsable; A = apoyo.

### T0 — Arranque y línea base (Nov – Dic 2026)

| # | Acción | R / A | Plazo | Entregable / criterio de cierre | OE |
|---|---|---|---|---|---|
| 1 | Medir línea base de todos los KPIs de la sección 1.4 | Jefe Logística / Analista | 30-nov | Hoja de línea base aprobada | Todos |
| 2 | Depurar Personal: eliminar "SIN-DNI", marcar cesados, completar cargo, área y tallas | Logístico / RR. HH. | 15-dic | 0 registros SIN-DNI; 100 % de activos con tallas | OE1 |
| 3 | Completar costo de todos los ítems con stock | Logístico / Compras | 15-dic | KPI "sin costo" = 0 | OE4 |
| 4 | Inventario general físico vs. sistema y ajuste documentado | Jefe Logística / Contabilidad | 20-dic | Acta de inventario y ajustes con sustento | OE3 |
| 5 | Respaldo de la hoja y revisión de usuarios/roles/PIN | ADMIN | 30-nov | Copia en Drive restringido; usuarios inactivos dados de baja | OE5 |

### T1 — Ene – Mar 2027: EPP y maestros

| # | Acción | R / A | Plazo | Entregable / criterio de cierre | OE |
|---|---|---|---|---|---|
| 6 | Matriz EPP por puesto (desde el IPERC) | Jefe SSOMA / Logística | 31-ene | Matriz aprobada y firmada | OE1 |
| 7 | Definir vida útil por ítem de EPP (fecha de renovación automática) | SSOMA / Logística | 15-feb | 100 % de EPP con vida útil en BASE | OE1 |
| 8 | Barrido de renovaciones vencidas (vista EPP por trabajador) | Logístico / Jefes de guardia | 28-feb | Vencidas > 7 días = 0 | OE1 |
| 9 | Cargar kardex físicos históricos pendientes y generar FO-SI-057 en Drive | Logístico | 31-mar | 100 % de activos con kardex en Drive | OE1, OE6 |
| 10 | Clasificación ABC × criticidad y stock mínimo en todos los ítems A y críticos | Jefe Logística | 15-mar | 100 % A/críticos con `min` | OE2 |
| 11 | Capacitar jefes de guardia en Nuevo pedido y firma en celular | Logística / SSOMA | 31-ene | Registro de asistencia; ≥ 90 % de pedidos por el sistema | OE2 |

### T2 — Abr – Jun 2027: reposición y medición

| # | Acción | R / A | Plazo | Entregable / criterio de cierre | OE |
|---|---|---|---|---|---|
| 12 | Revisión semanal de "Reponer" → requerimiento de compra | Logístico | Semanal | Requerimiento emitido cada lunes | OE2 |
| 13 | Inventario cíclico: A mensual, B trimestral | Logístico / Contabilidad | Desde abr | Exactitud ≥ 95 % | OE3 |
| 14 | Tablero Power BI: consumo valorizado, quiebres, fill rate, EPP vigente | Analista | 30-abr | Tablero publicado a Gerencia y SSOMA | OE4 |
| 15 | Medir tiempo de atención de pedidos (estado PENDIENTE → ENTREGADO) | Jefe Logística | 31-may | KPI fill rate ≤ 1 guardia reportado | OE2 |
| 16 | Auditoría interna de registros de EPP (muestra 10 % trabajadores) | SSOMA | 30-jun | Informe; 0 hallazgos mayores | OE6 |

### T3 — Jul – Set 2027: costos y proveedores

| # | Acción | R / A | Plazo | Entregable / criterio de cierre | OE |
|---|---|---|---|---|---|
| 17 | Análisis de consumo atípico por labor/trabajador con jefes de guardia | Jefe Logística | Mensual | Acta con acciones; desvíos explicados | OE4 |
| 18 | Licitación / acuerdo marco EPP y aceros (precio y tiempo de entrega) | Compras / Logística / SSOMA | 30-set | Contratos con lead time comprometido | OE2, OE4 |
| 19 | Homologar EPP (certificación, prueba en campo) antes de cambio de marca | SSOMA | 30-set | Ficha de homologación por ítem | OE1 |
| 20 | Manual de usuario y runbook del sistema; segundo ADMIN entrenado | ADMIN | 31-ago | Documentos en Drive; ≥ 2 ADMIN | OE5 |

### T4 — Oct – Dic 2027: consolidación

| # | Acción | R / A | Plazo | Entregable / criterio de cierre | OE |
|---|---|---|---|---|---|
| 21 | Inventario general anual | Jefe Logística / Contabilidad | 15-dic | Exactitud ≥ 95 %; ajustes ≤ 1 % | OE3 |
| 22 | Evaluación de cumplimiento de metas 2027 | Jefe Logística / SSOMA | 15-dic | Informe a Gerencia | Todos |
| 23 | Plan táctico 2028 y presupuesto | Jefe Logística | 20-dic | Plan aprobado | Todos |
| 24 | Prueba de restauración del respaldo del sistema | ADMIN | 30-nov | Restauración exitosa documentada | OE5 |

### 2.1 Rutina operativa que sostiene el plan

| Frecuencia | Actividad | Responsable |
|---|---|---|
| Cada guardia | Atender bandeja de pedidos; cerrar "Por firmar" | Logístico |
| Diario | Revisar "Vales pendientes de envío" (cola sin señal) | Logístico |
| Semanal | Reponer ≤ mínimo; renovaciones a 30 días; respaldo de la hoja | Logístico / ADMIN |
| Mensual | Inventario cíclico A; reporte de KPIs; reunión de consumo | Jefe Logística / SSOMA |
| Trimestral | Inventario B; avance del plan táctico a Gerencia | Jefe Logística |

### 2.2 Riesgos del plan y respuesta

| Riesgo | Respuesta |
|---|---|
| Jefes de guardia siguen pidiendo por fuera del sistema | No se despacha sin pedido o vale; indicador por guardia en el comité |
| Datos maestros se vuelven a ensuciar | Solo ADMIN/LOGÍSTICO editan catálogos; revisión mensual de SIN-DNI y sin costo |
| Caída del Apps Script o pérdida de acceso a Google | Respaldo semanal, 2 ADMIN, cola local; prueba de restauración anual |
| Proveedor incumple plazos de EPP crítico | Stock de seguridad para EPP crítico y segundo proveedor homologado |
