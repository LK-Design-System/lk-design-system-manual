import React from 'react';
import {Button} from '@lk-design-system/lds-core/components/buttons/Button';

// Editor commands reuse Core behavior, with an explicit low-emphasis treatment.
// Core ghost is a hairline button; remove only its border for quiet commands.
export const EditorButton=React.forwardRef(function EditorButton({variant='ghost',danger=false,styles,...props},ref){
 return <Button ref={ref} size="sm" variant={variant} {...props} styles={{...styles,root:{
  ...(variant==='ghost'?{border:'none'}:{}),
  ...(danger&&!props.disabled?{color:'var(--color-semantic-status-negative-text)'}:{}),
  ...styles?.root,
 }}}/>;
});
