import * as React from 'react';

const ValueContext = React.createContext<{
  display?: React.ReactNode;
  onValueChange: (value: string) => void;
}>({ onValueChange: () => {} });

const labelFor = (children: React.ReactNode, value: string | undefined): React.ReactNode => {
  if (value === undefined) return undefined;
  let found: React.ReactNode;

  const visit = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (found !== undefined || !React.isValidElement(child)) return;
      const props = child.props as { value?: string; children?: React.ReactNode };
      if (props.value === value) found = props.children;
      else if (props.children) visit(props.children);
    });
  };

  visit(children);
  return found;
};

export const Select = ({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) => {
  return (
    <ValueContext.Provider value={{ display: labelFor(children, value), onValueChange }}>
      <div data-testid="select-wrapper">{children}</div>
    </ValueContext.Provider>
  );
};

export const SelectTrigger = ({
  children,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}) => {
  return (
    <div role="combobox" data-testid="select-trigger" {...rest}>
      {children}
    </div>
  );
};

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { display } = React.useContext(ValueContext);
  return <span>{display ?? placeholder}</span>;
};

export const SelectContent = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="select-content">{children}</div>;
};

export const SelectItem = ({
  value,
  children,
  onClick,
}: {
  value: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  const { onValueChange } = React.useContext(ValueContext);
  return (
    <button
      type="button"
      data-value={value}
      data-testid={`select-item-${value}`}
      onClick={() => {
        onValueChange(value);
        onClick?.();
      }}
    >
      {children}
    </button>
  );
};
