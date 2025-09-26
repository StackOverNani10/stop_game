const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-lg text-gray-700">{message}</p>
        </div>
    </div>
);

export default LoadingScreen;
