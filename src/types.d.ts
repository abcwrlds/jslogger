// TypeScript declarations for Enmity
declare global {
    interface Window {
        enmity: {
            version?: string;
            modules: {
                common: {
                    Dispatcher: any;
                    React: any;
                };
                getByProps: (...props: string[]) => any;
            };
            patcher: {
                create: (id: string) => any;
            };
            plugins: {
                registerPlugin: (plugin: any) => void;
            };
        };
    }
}

export {};
