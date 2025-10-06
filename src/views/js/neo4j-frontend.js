// Funciones para interactuar con Neo4j desde el frontend
// Estas funciones llaman a endpoints del backend

const API_BASE = 'http://localhost:3000/api';

// Seguir usuario
export const followUser = async (followerMongoId, followedMongoId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/users/follow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                followerId: followerMongoId,
                followedId: followedMongoId
            })
        });

        if (!response.ok) {
            throw new Error('Error en la solicitud');
        }

        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Error siguiendo usuario:', error);
        throw error;
    }
};

// Dejar de seguir usuario
export const unfollowUser = async (followerMongoId, followedMongoId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/users/unfollow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                followerId: followerMongoId,
                followedId: followedMongoId
            })
        });

        if (!response.ok) {
            throw new Error('Error en la solicitud');
        }

        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Error dejando de seguir usuario:', error);
        throw error;
    }
};

// Verificar si está siguiendo
export const isFollowing = async (followerMongoId, followedMongoId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/users/isfollowing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                followerId: followerMongoId,
                followedId: followedMongoId
            })
        });

        if (!response.ok) {
            throw new Error('Error en la solicitud');
        }

        const result = await response.json();
        return result.isFollowing || false;
    } catch (error) {
        console.error('Error verificando seguimiento:', error);
        return false;
    }
};