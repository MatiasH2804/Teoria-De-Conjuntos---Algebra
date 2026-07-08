# Corrección final localizada

## Qué se corrigió

- Se limpió la codificación visible: acentos y símbolos de conjuntos quedan en UTF-8 real.
- Se mejoró la carga de conjuntos por comprensión evaluables en una ventana finita.
- Se pulió la sección del Diagrama de Venn para mostrar una consulta real y su resultado.

## Archivos tocados

- `index.html`
- `styles.css`
- `app.js`
- `sorongo.md`

## Conjuntos por comprensión

Se pueden cargar expresiones como:

```text
{x ∈ Z : x^2 >= 15}
{x∈Z:x² ≥ 15}
{x in Z | abs(x) >= 4}
{x : x in Z and x^2 menor que 15}
{x ∈ N : x ≤ 5}
```

La app evalúa esas reglas sobre un dominio discreto: `Z`, `N`, un rango o un conjunto explícito.

## Ventana numérica

El campo “Ventana numérica para Z/N” define el tramo usado para graficar y listar dominios infinitos.

Ejemplos válidos:

```text
-10..10
-10..10 step 2
range(-10,10)
range(-10,10,2)
```

Si `U = Z`, se usa la ventana completa. Si `U = N`, se usan solo naturales positivos dentro de la ventana.

## Mostrar en diagrama

El selector “Mostrar en diagrama” calcula un conjunto resultado, lo muestra en el panel lateral y destaca sus elementos en el SVG.

También se puede escribir una expresión libre, por ejemplo:

```text
A^c
A ∩ B
(A ∪ B)^c
{x ∈ Z : x^2 < 15}
```

## Casos de prueba

- `A = {x ∈ Z : x^2 >= 15}`, `U = Z`, ventana `-10..10`, mostrar `A^c`: resultado `{-3, -2, -1, 0, 1, 2, 3}`.
- `A = {x ∈ Z : x² ≥ 15}`, `U = Z`: acepta `²` y `≥`.
- `A = {x ∈ Z : x^2 menor que 15}`: resultado `{-3, -2, -1, 0, 1, 2, 3}`.
- `A = {1,2,3,4}`, `U = {1,2,3,4,5,6,7,8,9,10}`, mostrar `A^c`: resultado `{5, 6, 7, 8, 9, 10}`.
- `A = {1,{1},{2,3}}`, `B = {{1},2,3}`, mostrar `A ∩ B`: resultado `{{1}}`.

## Limitación

`Z` y `N` son infinitos. Para poder listar, calcular complementos y dibujar el Venn, la app usa una ventana finita de evaluación.
