import { Avatar, AvatarProps } from "@mui/material";
import { getAvatarColor, getInitials } from "../../../helpers/userAvatar";

interface UserAvatarProps extends Omit<AvatarProps, "src" | "alt" | "children"> {
    name: string;
    src?: string | null;
    size?: number;
}

export default function UserAvatar({ name, src, size = 36, sx, ...props }: UserAvatarProps) {
    return (
        <Avatar
            {...props}
            src={src ?? undefined}
            alt={name}
            sx={{
                width: size,
                height: size,
                fontSize: Math.round(size * 0.4),
                fontWeight: 500,
                backgroundColor: getAvatarColor(name),
                ...sx,
            }}
        >
            {getInitials(name)}
        </Avatar>
    );
}
