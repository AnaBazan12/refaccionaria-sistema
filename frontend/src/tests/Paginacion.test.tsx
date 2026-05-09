import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Paginacion from '../components/ui/Paginacion'

describe('Paginacion', () => {
  const defaultProps = {
    paginaActual: 1,
    totalPaginas: 5,
    total: 95,
    limite: 20,
    onCambiar: vi.fn(),
  }

  it('no se renderiza cuando hay solo 1 página', () => {
    const { container } = render(
      <Paginacion {...defaultProps} totalPaginas={1} total={15} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('muestra el rango de registros correctamente en la primera página', () => {
    render(<Paginacion {...defaultProps} />)
    expect(screen.getByText(/1–20/)).toBeInTheDocument()
    expect(screen.getByText(/95/)).toBeInTheDocument()
  })

  it('muestra el rango correcto en páginas intermedias', () => {
    render(<Paginacion {...defaultProps} paginaActual={3} />)
    expect(screen.getByText(/41–60/)).toBeInTheDocument()
  })

  it('muestra el fin ajustado en la última página', () => {
    render(<Paginacion {...defaultProps} paginaActual={5} />)
    expect(screen.getByText(/81–95/)).toBeInTheDocument()
  })

  it('deshabilita "Anterior" en la primera página', () => {
    render(<Paginacion {...defaultProps} paginaActual={1} />)
    const anterior = screen.getByText(/Anterior/)
    expect(anterior).toBeDisabled()
  })

  it('deshabilita "Siguiente" en la última página', () => {
    render(<Paginacion {...defaultProps} paginaActual={5} />)
    const siguiente = screen.getByText(/Siguiente/)
    expect(siguiente).toBeDisabled()
  })

  it('llama onCambiar con la página correcta al hacer clic en Siguiente', () => {
    const onCambiar = vi.fn()
    render(<Paginacion {...defaultProps} paginaActual={2} onCambiar={onCambiar} />)
    fireEvent.click(screen.getByText(/Siguiente/))
    expect(onCambiar).toHaveBeenCalledWith(3)
  })

  it('llama onCambiar con página anterior al hacer clic en Anterior', () => {
    const onCambiar = vi.fn()
    render(<Paginacion {...defaultProps} paginaActual={3} onCambiar={onCambiar} />)
    fireEvent.click(screen.getByText(/Anterior/))
    expect(onCambiar).toHaveBeenCalledWith(2)
  })

  it('llama onCambiar con el número de página al hacer clic en botón numérico', () => {
    const onCambiar = vi.fn()
    render(<Paginacion {...defaultProps} paginaActual={1} onCambiar={onCambiar} />)
    fireEvent.click(screen.getByText('3'))
    expect(onCambiar).toHaveBeenCalledWith(3)
  })

  it('deshabilita todos los botones numéricos cuando cargando=true', () => {
    render(<Paginacion {...defaultProps} paginaActual={3} cargando={true} />)
    // Los botones de número deben estar deshabilitados
    const boton2 = screen.getByText('2')
    expect(boton2).toBeDisabled()
  })

  it('muestra puntos suspensivos cuando hay páginas fuera del rango', () => {
    render(<Paginacion {...defaultProps} totalPaginas={10} paginaActual={5} total={200} />)
    const elipsis = screen.getAllByText('…')
    expect(elipsis.length).toBeGreaterThanOrEqual(1)
  })

  it('muestra el botón de primera página cuando el rango no empieza en 1', () => {
    render(<Paginacion {...defaultProps} totalPaginas={10} paginaActual={7} total={200} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('muestra el botón de última página cuando el rango no llega al final', () => {
    render(<Paginacion {...defaultProps} totalPaginas={10} paginaActual={3} total={200} />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})
