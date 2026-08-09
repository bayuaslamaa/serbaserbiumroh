import * as React from "react"

/**
 * The stand-in every suite that renders a Radix `Select` uses.
 *
 * Radix's Select never opens under happy-dom -- it needs pointer capture and a
 * portal that jsdom-alikes do not provide -- so each suite used to inline its
 * own stub, and three copies had drifted apart. This is the union of them,
 * resolved automatically by a factory-less `vi.mock("@/components/ui/select")`.
 *
 * Two things the older copies could not do, and the reason consolidating went
 * this direction rather than the other:
 *
 *  - an item click actually calls the enclosing Select's onValueChange, which
 *    is what lets a test drive the filters at all. The old copies rendered
 *    items as inert divs, so filtering was untestable through them;
 *  - the Select's `value` reaches the DOM through SelectValue, the way the real
 *    one shows the selected item and falls back to the placeholder only when
 *    there is none. The old copies destructured `value` and threw it away, so
 *    `<Select value={tier} onValueChange={setCity}>` -- a control that filters
 *    correctly but displays somebody else's state -- was invisible.
 *
 * SelectTrigger forwards `aria-label` for the same reason: components lean on
 * it for the triggers' accessible names, and a stub that dropped the attribute
 * made those names untestable.
 *
 * The `data-testid` and `data-value` attributes are carried over from the older
 * copies. Nothing asserts on them today, but they cost nothing and dropping
 * them would make this a replacement rather than a superset.
 */

const ValueContext = React.createContext<{
  display?: React.ReactNode
  onValueChange: (value: string) => void
}>({ onValueChange: () => {} })

/**
 * What the selected item renders, not its raw value -- a month select is keyed
 * on "9" and shows "September", so a stub echoing the value would have tests
 * asserting the stub rather than the component.
 */
function labelFor(children: React.ReactNode, value: string | undefined): React.ReactNode {
  if (value === undefined) return undefined
  let found: React.ReactNode

  const visit = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (found !== undefined || !React.isValidElement(child)) return
      const props = child.props as { value?: string; children?: React.ReactNode }
      if (props.value === value) found = props.children
      else if (props.children) visit(props.children)
    })
  }

  visit(children)
  return found
}

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <ValueContext.Provider value={{ display: labelFor(children, value), onValueChange }}>
      <div data-testid="select-wrapper">{children}</div>
    </ValueContext.Provider>
  )
}

export function SelectTrigger({
  children,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  "aria-label"?: string
}) {
  return (
    <div role="combobox" data-testid="select-trigger" {...rest}>
      {children}
    </div>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { display } = React.useContext(ValueContext)
  return <span>{display ?? placeholder}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <div data-testid="select-content">{children}</div>
}

export function SelectItem({
  value,
  children,
  onClick,
}: {
  value: string
  children: React.ReactNode
  onClick?: () => void
}) {
  const { onValueChange } = React.useContext(ValueContext)
  return (
    <button
      type="button"
      data-value={value}
      data-testid={`select-item-${value}`}
      onClick={() => {
        onValueChange(value)
        onClick?.()
      }}
    >
      {children}
    </button>
  )
}
