import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main role="alert" className="p-8"><h1>This view could not be displayed.</h1><p>Your saved data is unchanged. Reload to retry.</p><button onClick={()=>window.location.reload()}>Reload</button></main>:this.props.children;}
}
