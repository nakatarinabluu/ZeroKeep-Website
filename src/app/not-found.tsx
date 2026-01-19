export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white text-black font-sans">
            <div className="text-center">
                <h1 className="text-9xl font-extrabold text-gray-200">404</h1>
                <p className="text-2xl md:text-3xl font-light mt-4 text-gray-800">Page Not Found</p>
                <p className="mt-4 mb-8 text-gray-500">The requested resource could not be located on this server.</p>
                <div className="text-xs text-gray-300 mt-12 font-mono">
                    Apache/2.4.41 (Ubuntu) Server at localhost Port 80
                </div>
            </div>
        </div>
    );
}
