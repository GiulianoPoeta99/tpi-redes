# Windows Icon Requirements

## Icon File Needed

Para compilar el ejecutable de Windows, necesitas un archivo `icon.ico` en este directorio.

### Crear el icono

Puedes usar cualquiera de estos métodos:

#### Opción 1: Herramientas online
1. Ve a https://convertio.co/es/png-ico/ o https://www.icoconverter.com/
2. Sube el logo de tu aplicación (preferiblemente PNG de 512x512 o mayor)
3. Selecciona generar múltiples tamaños (16x16, 32x32, 48x48, 256x256)
4. Descarga el archivo .ico
5. Guárdalo como `icon.ico` en este directorio

#### Opción 2: ImageMagick (línea de comandos)
```bash
# Si tienes ImageMagick instalado
convert tu-logo.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

#### Opción 3: Usar logo existente
Si ya tienes `vite.svg` en este directorio:
```bash
# Convertir SVG a ICO
# Primero convertir a PNG de alta resolución
inkscape vite.svg --export-filename=temp.png --export-width=512 --export-height=512

# Luego a ICO
convert temp.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
rm temp.png
```

### Tamaños recomendados

El archivo .ico debe contener estos tamaños:
- 16x16 (para barra de tareas pequeña)
- 32x32 (para barra de tareas normal)
- 48x48 (para iconos medianos)
- 256x256 (para iconos grandes y Windows 10/11)

### Archivo temporal

Si no tienes un icono personalizado, puedes usar un icono placeholder:
1. Descarga cualquier icono de https://icons8.com/ o https://www.flaticon.com/
2. Conviértelo a .ico usando las herramientas mencionadas
3. Reemplázalo más tarde con tu icono final

## Linux Icon

Para Linux, también necesitas un `icon.png` (formato PNG, 512x512 recomendado).
