export function init(mountPointId: string) {
    import('react').then(React => {
        import('./App').then(({ App }) => {
            ReactDOM.render(<App />, document.getElementById(mountPointId));
        });
    });
}